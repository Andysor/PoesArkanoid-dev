#!/usr/bin/env python3
"""
Audio conversion script for iOS Safari optimization
Converts MP3 files to AAC (.m4a) format with optimized settings
"""

import os
import subprocess
import sys

def convert_mp3_to_aac(input_file, output_file, bitrate="64k"):
    """
    Convert MP3 to AAC using ffmpeg with iOS Safari optimized settings
    """
    try:
        cmd = [
            'ffmpeg',
            '-i', input_file,
            '-c:a', 'aac',
            '-b:a', bitrate,
            '-ar', '22050',  # Lower sample rate for mobile
            '-ac', '1',      # Mono for smaller file size
            '-movflags', '+faststart',  # Optimize for web streaming
            '-y',  # Overwrite output file
            output_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Converted {input_file} to {output_file}")
            return True
        else:
            print(f"❌ Failed to convert {input_file}: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("❌ ffmpeg not found. Please install ffmpeg first.")
        print("   Download from: https://ffmpeg.org/download.html")
        return False
    except Exception as e:
        print(f"❌ Error converting {input_file}: {e}")
        return False

def get_file_size_mb(file_path):
    """Get file size in MB"""
    try:
        size_bytes = os.path.getsize(file_path)
        return size_bytes / (1024 * 1024)
    except:
        return 0

def main():
    # Audio files to convert with their optimal bitrates
    audio_files = [
        ('hit.mp3', 'hit.m4a', '32k'),      # Very short sound, low bitrate
        ('lifeloss.mp3', 'lifeloss.m4a', '48k'),  # Short sound
        ('poesklap.mp3', 'poesklap.m4a', '48k'),  # Short sound
        ('brannas.mp3', 'brannas.m4a', '64k'),    # Medium length
        ('brick_glass_break.mp3', 'brick_glass_break.m4a', '64k'),
        ('brick_glass_destroyed.mp3', 'brick_glass_destroyed.m4a', '64k'),
        ('game_over1.mp3', 'game_over1.m4a', '96k'),  # Longer sound, higher quality
    ]
    
    input_dir = 'assets/sounds'
    output_dir = 'assets/sounds'
    
    print("🎵 Converting MP3 files to AAC for iOS Safari optimization...")
    print("=" * 60)
    
    total_saved = 0
    successful_conversions = 0
    
    for input_file, output_file, bitrate in audio_files:
        input_path = os.path.join(input_dir, input_file)
        output_path = os.path.join(output_dir, output_file)
        
        if not os.path.exists(input_path):
            print(f"⚠️  Skipping {input_file} - file not found")
            continue
        
        # Get original file size
        original_size = get_file_size_mb(input_path)
        
        # Convert the file
        if convert_mp3_to_aac(input_path, output_path, bitrate):
            successful_conversions += 1
            
            # Get new file size
            new_size = get_file_size_mb(output_path)
            saved = original_size - new_size
            
            print(f"   📊 Size: {original_size:.2f}MB → {new_size:.2f}MB (saved {saved:.2f}MB)")
            total_saved += saved
        else:
            print(f"   ❌ Conversion failed")
    
    print("=" * 60)
    print(f"✅ Conversion complete!")
    print(f"   Successfully converted: {successful_conversions}/{len(audio_files)} files")
    print(f"   Total space saved: {total_saved:.2f}MB")
    print("\n📝 Next steps:")
    print("   1. Update assets.js to use .m4a files")
    print("   2. Test audio on iOS Safari")
    print("   3. Remove old .mp3 files if everything works")

if __name__ == "__main__":
    main() 