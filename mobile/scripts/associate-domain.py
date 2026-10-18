#!/usr/bin/env python3
"""Publish universal-link association only after the real Apple team ID is supplied."""
from pathlib import Path
import json
import re
import sys

if len(sys.argv) != 2 or not re.fullmatch('[A-Z0-9]{10}', sys.argv[1]):
    raise SystemExit('Usage: python3 mobile/scripts/associate-domain.py YOUR_APPLE_TEAM_ID (10 uppercase letters/digits)')
root = Path(__file__).resolve().parents[2]
directory = root / '.well-known'
directory.mkdir(exist_ok=True)
data = {'applinks': {'details': [{'appIDs': [sys.argv[1] + '.com.dadarcade.app'], 'components': [{'/' : '/play/*', 'comment': 'Shared game links. The native app accepts only published mobile catalog games.'}]}]}}
(directory / 'apple-app-site-association').write_text(json.dumps(data, indent=2) + '\n')
print('Created .well-known/apple-app-site-association. Commit and deploy it before testing universal links on a signed device.')
