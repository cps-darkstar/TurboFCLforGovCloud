"""
TurboFCL Backend package initializer.

This module makes sure that the internal sub-package ``backend.app`` can also be
imported via the top-level name ``app``.  A lot of modules inside the codebase
use absolute imports such as ``from app.core.config import settings`` which
assume that ``app`` is importable from the current ``PYTHONPATH``.  When the
project is executed with the module path ``backend.app`` (e.g. via
``uvicorn backend.app.main:app``), that assumption no longer holds and will
lead to ``ModuleNotFoundError: No module named 'app'``.

By exporting an alias in ``sys.modules`` we allow both import styles to
co-exist without requiring intrusive refactors or runtime environment tweaks.
"""

import sys
from importlib import import_module
from pathlib import Path

# Path to the directory that contains this file (i.e., project_root/backend)
_current_dir = Path(__file__).resolve().parent

# Ensure the backend directory itself is on the import path so that the
# ``app`` sub-package can be discovered when the project is executed from the
# repository root.
if str(_current_dir) not in sys.path:
    sys.path.insert(0, str(_current_dir))

# Expose ``backend.app`` as a first-level module called ``app`` *once*.
# If the alias already exists we leave it untouched to avoid clobbering any
# application-provided replacement.
if "app" not in sys.modules:
    sys.modules["app"] = import_module(__name__ + ".app")
