import os
from PIL import Image

src_path = "/Users/prabhanjan/.gemini/antigravity-ide/brain/7e05ba01-e8a8-4aa4-9ec7-1075e775854a/netrartha_sankara_eye_icon_1784699751372.png"
android_res = "/Users/prabhanjan/Library/CloudStorage/OneDrive-SriKanchiKamakotiMedicalTrust/Projects/Diaret/retinopathy/mobile_app/android/app/src/main/res"

sizes = {
    "mipmap-mdpi": (48, 48),
    "mipmap-hdpi": (72, 72),
    "mipmap-xhdpi": (96, 96),
    "mipmap-xxhdpi": (144, 144),
    "mipmap-xxxhdpi": (192, 192),
}

img = Image.open(src_path)

for folder, size in sizes.items():
    out_dir = os.path.join(android_res, folder)
    os.makedirs(out_dir, exist_ok=True)
    resized = img.resize(size, Image.LANCZOS)
    out_file = os.path.join(out_dir, "ic_launcher.png")
    resized.save(out_file, "PNG")
    print(f"Saved {out_file} ({size[0]}x{size[1]})")

print("All Android launcher icons successfully updated!")
