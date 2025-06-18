@echo off
echo 🎵 Converting MP3 files to AAC for iOS Safari optimization...
echo ============================================================

cd assets\sounds

echo Converting hit.mp3...
ffmpeg -i hit.mp3 -c:a aac -b:a 32k -ar 22050 -ac 1 -movflags +faststart -y hit.m4a

echo Converting lifeloss.mp3...
ffmpeg -i lifeloss.mp3 -c:a aac -b:a 48k -ar 22050 -ac 1 -movflags +faststart -y lifeloss.m4a

echo Converting poesklap.mp3...
ffmpeg -i poesklap.mp3 -c:a aac -b:a 48k -ar 22050 -ac 1 -movflags +faststart -y poesklap.m4a

echo Converting brannas.mp3...
ffmpeg -i brannas.mp3 -c:a aac -b:a 64k -ar 22050 -ac 1 -movflags +faststart -y brannas.m4a

echo Converting brick_glass_break.mp3...
ffmpeg -i brick_glass_break.mp3 -c:a aac -b:a 64k -ar 22050 -ac 1 -movflags +faststart -y brick_glass_break.m4a

echo Converting brick_glass_destroyed.mp3...
ffmpeg -i brick_glass_destroyed.mp3 -c:a aac -b:a 64k -ar 22050 -ac 1 -movflags +faststart -y brick_glass_destroyed.m4a

echo Converting game_over1.mp3...
ffmpeg -i game_over1.mp3 -c:a aac -b:a 96k -ar 22050 -ac 1 -movflags +faststart -y game_over1.m4a

echo ============================================================
echo ✅ Conversion complete!
echo.
echo 📝 Next steps:
echo    1. Update assets.js to use .m4a files
echo    2. Test audio on iOS Safari
echo    3. Remove old .mp3 files if everything works
echo.
pause 