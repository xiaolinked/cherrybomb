import sys
import os
from PIL import Image
import numpy as np

def split_sheet(image_path, output_dir):
    try:
        img = Image.open(image_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening image: {e}")
        return

    data = np.array(img)
    r, g, b, a = data.T

    # WIDER DETECTION for Checkerboard.
    # Light Gray in these grids can vary (e.g. #F0F0F0, #E0E0E0, #CCCCCC)
    # We will assume that any pixel that is NEUTRAL (R~=G~=B) and BRIGHT (> 150) is background.
    # The sprites are red/black/green, so they shouldn't trigger this "neutral bright" check easily.
    
    is_neutral = (np.abs(r.astype(int) - g.astype(int)) < 15) & \
                 (np.abs(g.astype(int) - b.astype(int)) < 15)
                 
    is_bright = (r > 200) # Only catch the lighter squares
    
    # Also catch pure white
    is_white = (r > 245) & (g > 245) & (b > 245)
    
    is_background = (is_neutral & is_bright) | is_white
    
    # Debug: Save the "Content Mask" to see what we are detecting
    mask_debug = np.zeros_like(r)
    mask_debug[~is_background.T] = 255
    Image.fromarray(mask_debug.astype(np.uint8)).save(os.path.join(output_dir, "debug_mask.png"))
    
    # Force Alpha to 0 bounds
    data[..., 3][is_background.T] = 0
    clean_img = Image.fromarray(data)
    
    is_content = data[..., 3] > 0
    
    height, width = is_content.shape
    
    # --- Projection ---
    row_histogram = np.sum(is_content, axis=1)
    
    # Use a higher threshold for content to ignore "speckles" of border pixels that survived
    row_has_content = row_histogram > 10 
    
    rows = []
    in_row = False
    start_y = 0
    
    for y, has_content in enumerate(row_has_content):
        if has_content and not in_row:
            in_row = True
            start_y = y
        elif not has_content and in_row:
            in_row = False
            if (y - start_y) > 10: 
                rows.append((start_y, y))
    if in_row: rows.append((start_y, height))
    
    print(f"Detected {len(rows)} rows.")

    sprites = []
    
    for (r_y1, r_y2) in rows:
        row_slice = is_content[r_y1:r_y2, :]
        col_histogram = np.sum(row_slice, axis=0)
        col_has_content = col_histogram > 5 # higher threshold
        
        in_col = False
        start_x = 0
        
        for x, has_content in enumerate(col_has_content):
            if has_content and not in_col:
                in_col = True
                start_x = x
            elif not has_content and in_col:
                in_col = False
                if (x - start_x) > 10:
                    # Final refinement
                    cell = is_content[r_y1:r_y2, start_x:x]
                    y_ind, x_ind = np.where(cell)
                    if len(y_ind) > 0:
                        sprites.append((start_x + x_ind.min(), r_y1 + y_ind.min(), start_x + x_ind.max(), r_y1 + y_ind.max()))
        if in_col:
             if (width - start_x) > 10:
                cell = is_content[r_y1:r_y2, start_x:width]
                y_ind, x_ind = np.where(cell)
                if len(y_ind) > 0:
                     sprites.append((start_x + x_ind.min(), r_y1 + y_ind.min(), start_x + x_ind.max(), r_y1 + y_ind.max()))

    print(f"Found {len(sprites)} total sprites.")

    import glob
    files = glob.glob(os.path.join(output_dir, "sprite_*.png")) # Only delete sprites
    for f in files: os.remove(f)

    for i, bbox in enumerate(sprites):
        x1, y1, x2, y2 = bbox
        crop = clean_img.crop((x1, y1, x2+1, y2+1))
        name = f"sprite_{i:02d}.png"
        crop.save(os.path.join(output_dir, name))
        print(f"Saved {name}")

if __name__ == "__main__":
    split_sheet(sys.argv[1], sys.argv[2])
