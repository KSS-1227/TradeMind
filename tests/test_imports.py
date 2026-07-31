import sys
from pathlib import Path

# Ensure the project root is on sys.path so `backend.*` imports resolve
# regardless of how the script is invoked.
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.wealth.advisor.risk import *  # noqa: E402, F401, F403
from backend.wealth.advisor.opportunity import *  # noqa: E402, F401, F403
from backend.wealth.advisor.recommendations import *  # noqa: E402, F401, F403
from backend.wealth.advisor.alerts import *  # noqa: E402, F401, F403

print("All imports successful.")