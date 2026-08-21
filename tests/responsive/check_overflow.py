"""Visual + responsiveness checks for the authenticated screens at 360px.

Verifies there is no horizontal overflow (page level and per element) on the
chat, goals ("Metas") and profile screens, and saves screenshots for review.

Run:  python3 tests/responsive/check_overflow.py [--width 360] [--url http://localhost:8080]

Auth: a synthetic local session is written to localStorage so the app renders
the authenticated shell without needing a real login. Network calls to the
backend are stubbed/allowed to fail — this checks layout, not data.
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

SCREENSHOTS = Path(__file__).parent / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

LONG_TEXT = (
    "Quero conversar sobre responsabilidade e autoconhecimento profundissimo "
    "https://exemplo.com/um/caminho/absurdamente/longo/para/testar/quebra/de/linha "
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
)

SCREENS = [
    ("chat", "Conversa"),
    ("progress", "Metas"),
    ("profile", "Perfil"),
]


def fake_session(project_ref: str) -> tuple[str, str]:
    exp = int(time.time()) + 60 * 60 * 24
    user = {
        "id": "00000000-0000-4000-8000-000000000001",
        "aud": "authenticated",
        "role": "authenticated",
        "email": "teste.responsivo@exemplo.com",
        "created_at": "2026-01-01T00:00:00.000Z",
        "user_metadata": {"full_name": "Roberta Waleska de Teste"},
        "app_metadata": {"provider": "email"},
    }
    session = {
        "access_token": "test.access.token",
        "refresh_token": "test-refresh-token",
        "token_type": "bearer",
        "expires_in": 86400,
        "expires_at": exp,
        "user": user,
    }
    return f"sb-{project_ref}-auth-token", json.dumps(session)


async def collect_overflow(page, width: int):
    return await page.evaluate(
        """(width) => {
          const doc = document.documentElement;
          const offenders = [];
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            const style = getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none') continue;
            if (r.right > width + 1 || r.left < -1) {
              offenders.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.className || '').toString().slice(0, 80),
                left: Math.round(r.left),
                right: Math.round(r.right),
                text: (el.textContent || '').trim().slice(0, 50),
              });
            }
          }
          return {
            docScrollWidth: doc.scrollWidth,
            docClientWidth: doc.clientWidth,
            bodyScrollWidth: document.body.scrollWidth,
            offenders: offenders.slice(0, 15),
          };
        }""",
        width,
    )


async def run(url: str, width: int) -> int:
    project_ref = "pobzsvptmfrsezbwoiwk"
    storage_key, session_json = fake_session(project_ref)
    failures = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": width, "height": 1800})
        page = await context.new_page()

        await page.goto(url, wait_until="domcontentloaded")
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )
        await page.goto(url, wait_until="domcontentloaded")

        # Leave onboarding
        start = page.get_by_role("button", name="Começar")
        try:
            await start.first.click(timeout=8000)
        except Exception:
            print("! could not leave onboarding (auth shell not rendered)")
            await page.screenshot(path=str(SCREENSHOTS / f"error_{width}.png"))
            await browser.close()
            return 1

        for key, nav_label in SCREENS:
            try:
                await page.get_by_role("button", name=nav_label).first.click(timeout=8000)
            except Exception:
                failures.append(f"{key}: nav button '{nav_label}' not reachable")
                continue
            await page.wait_for_timeout(600)

            if key == "chat":
                box = page.get_by_placeholder("Digite sua mensagem...")
                await box.fill(LONG_TEXT)
                await box.press("Enter")
                await page.wait_for_timeout(800)

            result = await collect_overflow(page, width)
            await page.screenshot(path=str(SCREENSHOTS / f"{key}_{width}.png"))

            doc_overflow = result["docScrollWidth"] > result["docClientWidth"]
            if doc_overflow:
                failures.append(
                    f"{key}: page scrollWidth {result['docScrollWidth']} > "
                    f"clientWidth {result['docClientWidth']}"
                )
            for o in result["offenders"]:
                failures.append(
                    f"{key}: element <{o['tag']} class=\"{o['cls']}\"> "
                    f"spans {o['left']}..{o['right']} — {o['text']!r}"
                )
            status = "FAIL" if doc_overflow or result["offenders"] else "ok"
            print(f"[{status}] {key} @ {width}px — scrollWidth={result['docScrollWidth']} "
                  f"clientWidth={result['docClientWidth']} offenders={len(result['offenders'])}")

        await browser.close()

    if failures:
        print("\nFailures:")
        for f in failures:
            print(" -", f)
        return 1
    print(f"\nAll screens pass at {width}px — no horizontal overflow.")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8080")
    ap.add_argument("--width", type=int, default=360)
    args = ap.parse_args()
    sys.exit(asyncio.run(run(args.url, args.width)))
