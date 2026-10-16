# -*- coding: utf-8 -*-
"""Entrée historique du bot, désormais raccordée au site statique UFC.FR."""
from pathlib import Path
import runpy

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).resolve().parents[2] / "tools" / "editorial_bot.py"), run_name="__main__")
