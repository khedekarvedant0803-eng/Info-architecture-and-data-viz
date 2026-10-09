from parse_up import read_bmp
w, h, bpp, pixels = read_bmp('board.bmp')
def get_pixel(x, y):
    bytes_pp = bpp // 8
    idx = x * bytes_pp
    return pixels[y][idx], pixels[y][idx+1], pixels[y][idx+2]

print("Finding left edge Slot 2...")
left_xs = []
for y in range(200, 300):
    for x in range(740, 650, -1):
        b,g,r = get_pixel(x,y)
        if (r+g+b)/3 < 60:
            left_xs.append(x)
            break
if left_xs:
    print("Average left edge x Slot 2:", sum(left_xs)//len(left_xs))

print("Finding top edge Slot 2...")
top_ys = []
for x in range(680, 750):
    for y in range(247, 100, -1):
        b,g,r = get_pixel(x,y)
        if (r+g+b)/3 < 60:
            top_ys.append(y)
            break
if top_ys:
    print("Average top edge y Slot 2:", sum(top_ys)//len(top_ys))

