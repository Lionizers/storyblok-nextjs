import { is } from "type-assurance";

export function callLocalWebhooks(space: number) {
  let auth = "";
  const fetchWebhooks = async () => {
    console.log("Fetching webhooks...");
    console.log(
      await (
        await fetch(`https://app.storyblok.com/v1/spaces/${space}/webhook_endpoints`, {
          headers: { Authorization: auth },
        })
      ).json(),
    );
  };

  if (window.location.hostname === "localhost") {
    // Intercept setRequestHeader to get the Authorization header
    const setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
      // The first time we see the Authorization header we fetch the webhooks:
      if (!auth && name === "Authorization") {
        auth = value;
        fetchWebhooks();
      }
      setRequestHeader.call(this, name, value);
    };

    // Intercept send to know when a story is published
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      if (typeof body === "string") {
        try {
          const payload = JSON.parse(body);
          if (is(payload, { publish: "1", story: { full_slug: String } })) {
            console.log("Published!", payload.story.full_slug);
          }
        } catch (err) {}
      }
      send.call(this, body);
    };
  }
}
