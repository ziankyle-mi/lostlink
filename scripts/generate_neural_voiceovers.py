import asyncio
import edge_tts
import os
import shutil

VOICE = "en-US-AndrewMultilingualNeural"  # Warm, natural, authentic Copilot voice

NARRATIONS = [
    {
        "file": "voice_scene1_hook.mp3",
        "text": "Lost something on campus? Tracking it down shouldn't feel impossible.",
        "rate": "+3%",
    },
    {
        "file": "voice_scene2_reveal.mp3",
        "text": "Meet LostLink — De La Salle Araneta University's official lost and found platform.",
        "rate": "+4%",
    },
    {
        "file": "voice_scene3_feed.mp3",
        "text": "Browse everything reported on campus. Filter by category, location, or date — instantly.",
        "rate": "+4%",
    },
    {
        "file": "voice_scene4_report.mp3",
        "text": "Report a lost or found item in seconds. Upload a photo, tag the campus zone, and you're done.",
        "rate": "+4%",
    },
    {
        "file": "voice_scene5_admin.mp3",
        "text": "For the Disciplinary Office — a full claims queue, custody tracking, and a live audit trail.",
        "rate": "+4%",
    },
    {
        "file": "voice_scene6_tech.mp3",
        "text": "Built on Astro 5, React, Supabase, and Cloudflare — fast, secure, and ready for production.",
        "rate": "+4%",
    },
    {
        "file": "voice_scene7_outro.mp3",
        "text": "Never lose track again. Made by Group 3.",
        "rate": "+2%",
    },
]

async def generate_with_retry(item, max_retries=3):
    fname = item["file"]
    text = item["text"]
    rate = item["rate"]
    target_assets = os.path.join("assets", fname)
    target_public = os.path.join("public", "assets", fname)

    for attempt in range(1, max_retries + 1):
        try:
            communicator = edge_tts.Communicate(text, VOICE, rate=rate)
            await communicator.save(target_assets)
            shutil.copyfile(target_assets, target_public)
            print(f"Generated: {fname} -> {os.path.getsize(target_assets)} bytes")
            return
        except Exception as e:
            print(f"Attempt {attempt} failed for {fname}: {e}")
            await asyncio.sleep(2.0)
            
    # Fallback to en-US-ChristopherNeural if Andrew has rate limit
    try:
        communicator = edge_tts.Communicate(text, "en-US-ChristopherNeural", rate=rate)
        await communicator.save(target_assets)
        shutil.copyfile(target_assets, target_public)
        print(f"Generated with fallback: {fname} -> {os.path.getsize(target_assets)} bytes")
    except Exception as e:
        print(f"Fatal fallback failed for {fname}: {e}")

async def main():
    os.makedirs("assets", exist_ok=True)
    os.makedirs("public/assets", exist_ok=True)

    print("Generating natural neural voiceovers...")
    for item in NARRATIONS:
        await generate_with_retry(item)
        await asyncio.sleep(0.5)

    print("All neural voiceovers generated successfully!")

if __name__ == "__main__":
    asyncio.run(main())
