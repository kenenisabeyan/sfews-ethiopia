with open("test_out.txt", "w") as f:
    f.write("STEP 1\n")
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["USE_SQLITE"] = "1"
with open("test_out.txt", "a") as f:
    f.write("STEP 2\n")
from app.main import app, lifespan
with open("test_out.txt", "a") as f:
    f.write("STEP 3\n")
import asyncio
async def main():
    with open("test_out.txt", "a") as f:
        f.write("STEP 4 entering lifespan\n")
    async with lifespan(app):
        with open("test_out.txt", "a") as f:
            f.write("STEP 5 inside lifespan\n")
asyncio.run(main())
with open("test_out.txt", "a") as f:
    f.write("STEP 6 done\n")
