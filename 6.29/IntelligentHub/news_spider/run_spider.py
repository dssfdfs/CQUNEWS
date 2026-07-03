import subprocess
import sys
import os


def run_spider():
    spider_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(spider_dir)
    
    result = subprocess.run(
        [sys.executable, '-m', 'scrapy', 'crawl', 'news_sites'],
        capture_output=True,
        text=True,
        timeout=300
    )
    
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
    print("Return code:", result.returncode)
    
    return result.returncode == 0


if __name__ == '__main__':
    run_spider()
