// src/app/api/proxy/[...path]/route.js
//
// This proxies requests from the (HTTPS) Vercel frontend to the
// (HTTP-only) Somee backend. Browsers block HTTPS pages from calling
// HTTP endpoints directly ("Mixed Content"), but they don't block
// same-origin calls to this Next.js route. This route then makes the
// HTTP call server-side, where there's no such restriction, and
// returns the response back to the browser.

const BACKEND_ROOT_URL = "http://dmgbotapi.somee.com";

async function handler(request, { params }) {
  const { path } = await params;
  const targetPath = Array.isArray(path) ? path.join("/") : "";
  const search = request.nextUrl.search; // includes leading "?" if present

  // Uploaded files (images/docs) are served by the backend's static /files route,
  // which lives OUTSIDE /api. Everything else is a real /api/* controller call.
  const isStaticFile = targetPath.startsWith("files/");
  const targetUrl = isStaticFile
    ? `${BACKEND_ROOT_URL}/${targetPath}${search}`
    : `${BACKEND_ROOT_URL}/api/${targetPath}${search}`;

  const headers = new Headers();
  const authHeader = request.headers.get("authorization");
  if (authHeader) headers.set("authorization", authHeader);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const init = {
    method: request.method,
    headers,
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  try {
    const backendResponse = await fetch(targetUrl, init);
    const responseBody = await backendResponse.arrayBuffer();

    return new Response(responseBody, {
      status: backendResponse.status,
      headers: {
        "content-type": backendResponse.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ message: "Proxy request to backend failed.", error: String(err) }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };