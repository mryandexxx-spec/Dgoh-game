# Small HDR environment (Radiance .hdr, equirectangular 256x128) for image-based lighting of the hero showcase:
# warm dusk sky over the desert, a bright low sun, cool zenith, dark sand bounce. Written as a data URL for the game.
import numpy as np, base64, sys
W, H = 256, 128
v = (np.arange(H) + .5) / H; u = (np.arange(W) + .5) / W
lat = (.5 - v) * np.pi                     # +pi/2 up
lon = (u - .5) * 2 * np.pi
LON, LAT = np.meshgrid(lon, lat)
d = np.stack([np.cos(LAT) * np.sin(LON), np.sin(LAT), np.cos(LAT) * np.cos(LON)], -1)
up = np.clip(d[..., 1], -1, 1)
sky_h = np.array([1.35, .95, .62]); sky_z = np.array([.32, .42, .62]); ground = np.array([.16, .11, .07])
t = np.clip(up, 0, 1) ** .55
col = sky_h * (1 - t)[..., None] + sky_z * t[..., None]
col = np.where((up < 0)[..., None], ground * (1 + .6 * np.exp(up * 6))[..., None], col)
sun = np.array([np.sin(.9) * np.cos(.38), np.sin(.38), np.cos(.9) * np.cos(.38)])     # front-right, 22° high
cs = np.clip(d @ sun, -1, 1)
col += np.array([18., 13.5, 9.]) * (cs > np.cos(.045))[..., None] + np.array([1.4, 1., .6]) * np.exp((cs - 1) * 14)[..., None]
rim = np.array([-np.sin(2.6), np.sin(.3), np.cos(2.6)]); cr = np.clip(d @ rim, -1, 1)
col += np.array([.35, .5, .9]) * np.exp((cr - 1) * 6)[..., None]             # cool back-light from behind-left
def rgbe(c):
    m = c.max(-1); e = np.floor(np.log2(np.maximum(m, 1e-32))) + 1; sc = np.where(m > 1e-32, 256.0 / 2.0 ** e, 0)
    out = np.zeros(c.shape[:-1] + (4,), np.uint8); out[..., :3] = np.clip(c * sc[..., None], 0, 255).astype(np.uint8); out[..., 3] = np.where(m > 1e-32, e + 128, 0).astype(np.uint8); return out
data = b'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y %d +X %d\n' % (H, W) + rgbe(col.astype(np.float32)).tobytes()
open('/home/claude/dune/blender/env_desert.hdr', 'wb').write(data)
url = 'data:application/octet-stream;base64,' + base64.b64encode(data).decode()
open('/home/claude/dune/blender/env_desert.url', 'w').write(url)
print('hdr bytes', len(data), 'url', len(url))
