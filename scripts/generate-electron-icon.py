from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter


SOURCE = Path(
    r"C:\Users\fsyua\.cursor\projects\c-Development-TutorScheduler\assets\c__Users_fsyua_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-5d2b4416-9beb-4940-bcb0-93c27c6aa226.png"
)
OUT_DIR = Path(r"C:\Development\TutorScheduler\electron")
PNG_OUT = OUT_DIR / "icon.png"
ICO_OUT = OUT_DIR / "icon.ico"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    src = Image.open(SOURCE).convert("RGBA")

    # Sample the inner circular cyan area as the pure background tone.
    sample_color = src.getpixel((src.width // 2, int(src.height * 0.12)))
    bg_color = (sample_color[0], sample_color[1], sample_color[2], 255)

    canvas_size = 1024
    canvas = Image.new("RGBA", (canvas_size, canvas_size), bg_color)

    # Keep the character drawing while removing the outer photo background.
    inner = src.resize((900, 900), Image.Resampling.LANCZOS)
    mask = Image.new("L", inner.size, 0)
    draw = ImageDraw.Draw(mask)
    pad = 12
    draw.ellipse((pad, pad, inner.width - pad, inner.height - pad), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=1.2))

    offset = ((canvas_size - inner.width) // 2, (canvas_size - inner.height) // 2)
    canvas.paste(inner, offset, mask)

    canvas.save(PNG_OUT, format="PNG")
    canvas.convert("RGBA").save(
        ICO_OUT,
        format="ICO",
        sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)],
    )


if __name__ == "__main__":
    main()
