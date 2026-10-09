import struct
def read_bmp(filename):
    with open(filename, 'rb') as f:
        f.read(10)
        offset = struct.unpack('<I', f.read(4))[0]
        f.read(4)
        width = struct.unpack('<i', f.read(4))[0]
        height = struct.unpack('<i', f.read(4))[0]
        f.read(2)
        bpp = struct.unpack('<H', f.read(2))[0]
        top_down = (height < 0)
        height = abs(height)
        f.seek(offset)
        row_size = ((width * bpp + 31) // 32) * 4
        pixels = []
        for y in range(height):
            pixels.append(f.read(row_size))
        if not top_down:
            pixels.reverse()
        return width, height, bpp, pixels

w, h, bpp, pixels = read_bmp('board.bmp')
def get_pixel(x, y):
    bytes_pp = bpp // 8
    idx = x * bytes_pp
    return pixels[y][idx], pixels[y][idx+1], pixels[y][idx+2]

# The shadow is a dark line at the top and left of the slots.
# Slot 1 is around x=100..200, y=100..300.
print("Scanning for Slot 1 shadow (top edge)")
s1_top_y = None
s1_left_x = None

for y in range(100, 300):
    # check horizontal line for dark pixels
    dark_run = 0
    start_x = -1
    for x in range(120, 250):
        b,g,r = get_pixel(x,y)
        if (r+g+b)/3 < 100:
            if dark_run == 0: start_x = x
            dark_run += 1
        else:
            if dark_run > 50:
                print(f"Slot 1 top edge found at y={y}, from x={start_x} to x={start_x+dark_run}")
                s1_top_y = y
                s1_left_x = start_x
                break
            dark_run = 0
    if s1_top_y: break

print("Scanning for Slot 2 shadow (top edge)")
s2_top_y = None
s2_left_x = None
for y in range(100, 300):
    dark_run = 0
    start_x = -1
    for x in range(650, 800):
        b,g,r = get_pixel(x,y)
        if (r+g+b)/3 < 100:
            if dark_run == 0: start_x = x
            dark_run += 1
        else:
            if dark_run > 50:
                print(f"Slot 2 top edge found at y={y}, from x={start_x} to x={start_x+dark_run}")
                s2_top_y = y
                s2_left_x = start_x
                break
            dark_run = 0
    if s2_top_y: break
