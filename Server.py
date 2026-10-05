"""Tiny local server: serves this folder and proxies EAE storage files (adds CORS access).

Run:   python server.py
Open:  http://localhost:8000
"""
import http.server
import socketserver
import urllib.parse
import urllib.request

PORT = 8000
ALLOWED_HOSTS = {
    "energyaccess-storage.s3.amazonaws.com",
    "wri-public-data.s3.amazonaws.com",
}
cache = {}


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/proxy":
            return super().do_GET()

        url = urllib.parse.parse_qs(parsed.query).get("url", [""])[0]
        host = urllib.parse.urlparse(url).netloc
        if host not in ALLOWED_HOSTS:
            self.send_error(403, "Host not allowed")
            return

        try:
            if url not in cache:
                req = urllib.request.Request(url, headers={"User-Agent": "eae-wrapper"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    cache[url] = r.read()
            body = cache[url]
        except Exception as e:
            self.send_error(502, "Upstream error: %s" % e)
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("", PORT), Handler) as httpd:
        print("Open http://localhost:%d  (Ctrl+C to stop)" % PORT)
        httpd.serve_forever()