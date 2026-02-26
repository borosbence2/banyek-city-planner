import http.server
import socketserver
import mimetypes

PORT = 8080

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/html', '.html')

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving FoE City Planner at http://localhost:{PORT}")
    httpd.serve_forever()
