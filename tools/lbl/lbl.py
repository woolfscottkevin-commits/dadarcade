"""Single import for Layer by Layer 2 tools.

    from lbl import *

gives Build, B (block registry), reg (register a block), tx (texture helpers), the shape and item
hooks, and every helper from helpers.py (gable, hip, disc, ring, door, line3, blob...).
Importing this also loads every module in ext/ (new blocks, textures and shapes for Volume 2).
"""
import os, sys, importlib, pkgutil
HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path: sys.path.insert(0, HERE)

import textures as tx
from blocks import B, reg
from engine import Build, EXTRA_SHAPES, SPECIAL, u16, half_box, quarter_box, side_panel, render, DIRS, OPP, CCW, ROT
from plans import EXTRA_ITEMS, item_of
from helpers import *

def _load_ext():
    pkg = os.path.join(HERE, 'ext')
    for m in sorted(pkgutil.iter_modules([pkg]), key=lambda m: m.name):
        if m.name.startswith('_'): continue
        try: importlib.import_module('ext.' + m.name)
        except Exception as e:   # a half-written block module must not break everyone's previews
            print(f'!! skipped ext/{m.name}.py: {type(e).__name__}: {e}', file=sys.stderr)
_load_ext()
