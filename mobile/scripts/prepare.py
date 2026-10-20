#!/usr/bin/env python3
"""Rebuild the bundled catalog and offline favorites from the website source."""
from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[2]
MOBILE = ROOT / 'mobile'
RESOURCES = MOBILE / 'DadArcade/Resources'
OFFLINE = RESOURCES / 'Offline'

def offline_html(html):
    def clean_script(match):
        text = match.group(0)
        if 'googletagmanager.com' in text or re.search(r"gtag\(['\"]config['\"]", text):
            return ''
        return text
    html = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', clean_script, html, flags=re.I)
    html = re.sub(r'<link\b[^>]*href=[\"\']https?://[^>]*>', '', html, flags=re.I)
    html = re.sub(r'<link\b[^>]*rel=[\"\'](?:manifest|apple-touch-icon)[\"\'][^>]*>', '', html, flags=re.I)
    policy = "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; font-src 'self' data:; img-src 'self' data: blob:; media-src 'self' data: blob:; object-src 'none'; frame-src 'none'"
    inject = '<meta http-equiv="Content-Security-Policy" content="' + policy + '">\n<script>window.gtag=function(){};</script>\n<script src="/offline-scores.js"></script>'
    return html.replace('<head>', '<head>\n' + inject, 1)

def prepare():
    RESOURCES.mkdir(parents=True, exist_ok=True)
    if OFFLINE.exists(): shutil.rmtree(OFFLINE)
    OFFLINE.mkdir()
    shutil.copy2(ROOT / 'games/index.html', RESOURCES / 'catalog.html')
    for game in ['mahjong', 'balloon-uncle-bop']:
        excluded = ['*.md', '*.txt', '.DS_Store', 'face-*.png']
        if game == 'balloon-uncle-bop': excluded += ['icons', '*.webmanifest']
        shutil.copytree(ROOT / game, OFFLINE / game, ignore=shutil.ignore_patterns(*excluded))
    for file in OFFLINE.rglob('*.html'):
        file.write_text(offline_html(file.read_text()))
    shutil.copy2(MOBILE / 'offline-scores.js', OFFLINE / 'offline-scores.js')
    assets = MOBILE / 'DadArcade/Assets.xcassets'
    assets.mkdir(parents=True, exist_ok=True)
    (assets / 'Contents.json').write_text(json.dumps({'info': {'author': 'xcode', 'version': 1}}))
    for name, game in [('MahjongIcon', 'mahjong'), ('BalloonIcon', 'balloon-uncle-bop')]:
        directory = assets / (name + '.imageset')
        directory.mkdir(exist_ok=True)
        source = ROOT / game / ('assets/public-icon.png' if game == 'balloon-uncle-bop' else 'icons/icon-512.png')
        shutil.copy2(source, directory / 'icon.png')
        (directory / 'Contents.json').write_text(json.dumps({'images': [{'filename': 'icon.png', 'idiom': 'universal'}], 'info': {'author': 'xcode', 'version': 1}}, indent=2))
    print('Prepared Mahjong Garden, American Mah Jongg, Balloon Uncle Bop, and the website catalog.')

if __name__ == '__main__': prepare()
