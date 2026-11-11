export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";

    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    const respond = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers });

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return respond({ error: "Use POST" }, 405);
    }

    if (!env.GEMINI_API_KEY) {
      return respond({
        error: "GEMINI_API_KEY is not configured"
      }, 500);
    }

    try {
      const now = Date.now();

      const payload = {
        uses: 1,
        expireTime: new Date(
          now + 30 * 60 * 1000
        ).toISOString(),
        newSessionExpireTime: new Date(
          now + 60 * 1000
        ).toISOString()
      };

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1alpha/auth_tokens",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": env.GEMINI_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return respond({
          error: data?.error?.message || "Token generation failed",
          details: data
        }, response.status);
      }

      if (!data?.name) {
        return respond({
          error: "No token returned",
          details: data
        }, 500);
      }

      return respond({
        success: true,
        token: data.name,
        workerVersion: "2.0"
      });

    } catch (error) {
      return respond({
        error: error?.message || "Worker error"
      }, 500);
    }
  }
};
