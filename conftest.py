# conftest.py — adds the project root to sys.path so that
# `import backend.wealth...` works without installing the package.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
