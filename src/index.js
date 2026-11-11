export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";

    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };

    const jsonResponse = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Use POST" }, 405);
    }

    if (!env.GEMINI_API_KEY) {
      return jsonResponse({
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
        "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
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
        return jsonResponse({
          error: data?.error?.message ||
            "Gemini token generation failed",
          details: data
        }, response.status);
      }

      if (!data?.name) {
        return jsonResponse({
          error: "No authentication token returned",
          details: data
        }, 500);
      }

      return jsonResponse({
        token: data.name,
        success: true
      });

    } catch (error) {
      return jsonResponse({
        error: error?.message || "Worker error"
      }, 500);
    }
  }
};
