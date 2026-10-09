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

w, h, bpp, pixels = read_bmp('up.bmp')
def get_pixel(x, y):
    bytes_pp = bpp // 8
    idx = x * bytes_pp
    return pixels[y][idx], pixels[y][idx+1], pixels[y][idx+2]

print(f"Size: {w}x{h}")
for y in range(50, 300, 5):
    for x in range(50, 250):
        b,g,r = get_pixel(x,y)
        if (r+g+b)/3 < 70:
            print(f"Top-left shadow of Slot 1 roughly at x={x}, y={y}")
            break
    else:
        continue
    break
