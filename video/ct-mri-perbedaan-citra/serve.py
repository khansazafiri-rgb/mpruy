"""Local preview server with byte ranges for reliable MP4 seeking."""
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import os,re,sys
os.chdir(Path(__file__).resolve().parent)
class Handler(SimpleHTTPRequestHandler):
 def send_head(self):
  self.remaining=None
  fpath=Path(self.translate_path(self.path))
  match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers.get('Range',''))
  if not match or not fpath.is_file():return super().send_head()
  size=fpath.stat().st_size;start=int(match.group(1));end=min(int(match.group(2)) if match.group(2) else size-1,size-1)
  if start>=size or end<start:
   self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return None
  f=fpath.open('rb');f.seek(start);self.remaining=end-start+1
  self.send_response(206);self.send_header('Content-Type',self.guess_type(str(fpath)));self.send_header('Content-Length',str(self.remaining));self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Accept-Ranges','bytes');self.send_header('Cache-Control','no-store');self.end_headers();return f
 def copyfile(self,source,outputfile):
  if self.remaining is None:return super().copyfile(source,outputfile)
  try:
   while self.remaining:
    buf=source.read(min(self.remaining,65536))
    if not buf:break
    outputfile.write(buf);self.remaining-=len(buf)
  except (BrokenPipeError,ConnectionResetError):pass
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1]) if len(sys.argv)>1 else 8765),Handler).serve_forever()
