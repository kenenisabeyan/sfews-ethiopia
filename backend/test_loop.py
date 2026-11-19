import sys, os
import asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def test():
    print("HELLO FROM ASYNCIO SELECTOR LOOP", flush=True)

asyncio.run(test())
