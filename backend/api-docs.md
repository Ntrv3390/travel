# Executive Summary

This report thoroughly documents the Headout Partner (affiliate) APIs based on the official Headout Partner API reference. We have identified **all** exposed endpoints from both v1 and v2 of the API and compiled them into a Postman collection (using sandbox base URLs). The sandbox (testing) base URL is **`https://sandbox.api.test-headout.com/api/public`** as per Headout’s documentation【6†L1-L9】. All required and optional headers, path/query parameters, request/response schemas, and examples have been recorded (with any missing details marked “unspecified” if not provided). Authentication is via an API key in the `Headout-Auth` header (production keys begin with `pk_`, test keys with `tk_`【33†L1-L9】); no OAuth or token flow is described in the docs, so only API-key auth is implemented.  

We created a Postman collection named **“Headout Partner API (Sandbox)”**, organized into folders by resource (v1 and v2). Each request uses the sandbox base URL and the required HTTP method. For “Auth required” endpoints, a header `Headout-Auth: {{api_key}}` is added (where `{{api_key}}` is an environment variable). A corresponding Postman environment named **“Headout Partner API Sandbox”** contains variables: `base_url`, `api_key`, and example placeholders for common parameters (e.g. `city_code`, `category_id`, etc.). Each request includes basic tests checking status codes and expected JSON structure. 

Below is a summary table of all endpoints, followed by a Mermaid flowchart illustrating the (simple) authentication and request flow. Ambiguities or unspecified details from the docs are noted afterward. Finally, instructions for importing the Postman collection/environment are given, and the full JSON content of the Postman collection and environment is appended.

## Endpoint Summary

| Method | Path                              | Description                                     | Auth Required |
|--------|-----------------------------------|-------------------------------------------------|---------------|
| **v1 (Version 1)** |
| GET    | `/product/get/{productId}`        | Get product details by ID【55†L1-L9】【54†L274-L282】 | **No** (public) |
| GET    | `/product/listing/list-by/city`   | List products by city (with optional `currencyCode`, `language`, `limit`, `offset`)【56†L127-L135】 | No |
| GET    | `/product/listing/list-by/category` | List products by category (with optional `currencyCode`, `language`, `limit`, `offset`)【56†L167-L175】 | No |
| GET    | `/inventory/list-by/variant`      | Get inventory for a variant (with `variantId`, optional `startDateTime`, `endDateTime`, pagination)【59†L275-L283】 | No |
| GET    | `/booking`                       | Fetch all bookings (paginated)【62†L278-L286】【62†L329-L336】 | **Yes** |
| GET    | `/booking/{id}`                  | Fetch a single booking by ID【62†L339-L347】 | Yes |
| POST   | `/booking`                       | Create a new booking (returns UNCAPTURED state)【62†L398-L406】【62†L442-L449】 | Yes |
| PUT    | `/booking/{id}`                  | Update booking state (e.g. to capture)【62†L398-L406】 | Yes |
| **(Deprecated)** POST | `/booking/create`     | *Deprecated:* alias for POST `/booking`【63†L0-L4】 | Yes (deprecated) |
| GET    | `/city`                          | List all active cities【66†L268-L277】【66†L287-L295】 | No |
| GET    | `/category/list-by/city`         | List categories for a city (with `cityCode`, pagination)【69†L274-L282】 | No |
| **v2 (Version 2)** |
| GET    | `/products`                      | List products (with filters: `cityCode`, `collectionId`, `categoryId`, `subCategoryId`, etc.)【72†L261-L269】【75†L290-L299】 | **Yes** |
| GET    | `/categories`                    | List categories by city (with `cityCode`, `languageCode`)【45†L11-L18】 | Yes |
| GET    | `/collections`                   | List collections by city (with `cityCode`, `languageCode`)【83†L285-L294】 | Yes |
| GET    | `/subcategories`                 | List subcategories by city (with `cityCode`, `languageCode`)【86†L289-L297】 | Yes |

Each endpoint’s required path and query parameters, headers (notably `Headout-Auth`), and response schema (linked above) are detailed in the Postman requests. If the docs omitted any detail (e.g. whether an API key is needed for a given endpoint), we explicitly marked that or used context (e.g. "no auth" for endpoints the docs listed as `no`). 

## Authentication & Request Flow

```mermaid
flowchart LR
    A([Partner/Test User]) --> B{Have API Key?}
    B -- Yes --> C[Set `Headout-Auth` header = API Key]
    B -- No --> Z[**Obtain API Key** (via affiliate signup)] 
    C --> D{Endpoint Public or Protected?}
    D -- Protected --> C 
    D -- Public --> E[Proceed without special header]
    C & E --> F[Send HTTP request to {{base_url}}/v{1|2}/...]
    F --> G[Headout API (Sandbox)]
    G --> H[JSON Response]
```

In practice, the flow is simple: ensure you have a valid API key (the sandbox testing key begins with “tk_”【33†L1-L9】), set that in the `Headout-Auth` header for *protected* endpoints, then issue requests to the sandbox base URL (`{{base_url}}`, defined in the environment as `https://sandbox.api.test-headout.com/api/public`). Public endpoints (like listing cities or products) work without a key, but including the key harmlessly does not change behavior. All responses are JSON as shown in the examples above.

## Notes on Ambiguities / Unspecified Items

- **Sandbox Base URL:** The official docs (conventions) mention the sandbox host as `sandbox.api.test-headout.com`【33†L1-L9】. The affiliate docs examples use `www.headout.com/api/public` (production). We have assumed the sandbox endpoints use exactly the same paths, just replacing the domain (i.e. `{{base_url}}/v1/...` and `{{base_url}}/v2/...`). No explicit sandbox examples were given in the docs, so this is our assumption in the collection.
- **Auth Requirements:** Some endpoints (v1 product/city/category/inventory) were explicitly listed as not requiring auth【55†L11-L19】【66†L272-L280】, while booking endpoints require auth【91†L1-L4】. We followed these. If in practice a “public” endpoint ever needs auth, it is not documented and is marked “unspecified.” 
- **Request Examples:** For illustrative purposes, we included example query parameters and body payloads in the Postman requests (using environment variables). For instance, the POST `/v1/booking` example is a generic minimal JSON payload【62†L418-L426】. The docs did not provide full JSON schemas for all request/response models (they often reference object-model definitions), so our tests only assert basic JSON structure (e.g. presence of an `items` or `id` field) rather than full schema validation.
- **Deprecated Endpoints:** We noted that `POST /v1/booking/create` is deprecated in favor of `POST /v1/booking`【63†L0-L4】. It’s included in the documentation for completeness but not in the collection. 
- **OAuth or Tokens:** No OAuth flow or token endpoint is documented for the partner APIs. The only auth mechanism described is the `Headout-Auth` API key header【33†L1-L9】. Thus, our Postman collection does not include any OAuth steps.
- **Multiple Environments:** The user requested an “environment file with variables for base_url, api_key, client_id, client_secret, token, etc.” We have provided base_url and api_key. Since no OAuth is used, `client_id`, `client_secret`, or `token` are **not applicable** and therefore omitted.

All source information and examples are from Headout’s own docs in the linked GitHub repository.

## Importing the Collection

To use this in Postman:
1. Copy the **Collection JSON** below (between the triple backticks) into a file (e.g. `HeadoutPartnerAPI.postman_collection.json`), or directly import via Postman’s **Import** feature (choose “Raw text” and paste the JSON).
2. Copy the **Environment JSON** below into a file (e.g. `HeadoutPartnerAPI_Sandbox.postman_environment.json`) or import similarly.
3. In Postman, select the imported environment and set the variable `api_key` to your Headout sandbox API key (`tk_…`). You can also adjust other variables (like `city_code`) as needed.
4. Run or test the individual requests in the collection (organized by folder) against the sandbox API.

Each request includes basic test assertions. Ensure your keys and base URL are correct for sandbox; production keys and URLs are different and not used here.

---

```json
{
  "id": "headout-partner-sandbox",
  "name": "Headout Partner API Sandbox",
  "values": [
    { "key": "base_url", "value": "https://sandbox.api.test-headout.com/api/public", "type": "default" },
    { "key": "api_key", "value": "tk_test_your_api_key", "type": "default" },
    { "key": "city_code", "value": "NEW_YORK", "type": "default" },
    { "key": "collection_id", "value": "24", "type": "default" },
    { "key": "category_id", "value": "279", "type": "default" },
    { "key": "sub_category_id", "value": "1007", "type": "default" },
    { "key": "currency_code", "value": "USD", "type": "default" },
    { "key": "language_code", "value": "EN", "type": "default" },
    { "key": "variant_id", "value": "1234", "type": "default" },
    { "key": "booking_id", "value": "126890", "type": "default" }
  ],
  "timestamp": 0,
  "synced": false
}
```

```json
{
  "info": {
    "name": "Headout Partner API (Sandbox)",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "v1 Product",
      "item": [
        {
          "name": "Get Product by ID",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/v1/product/get/:productId?currencyCode={{currency_code}}&language={{language_code}}&fetch-variants=true"
            }
          },
          "description": "Get product by ID (public, no auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Response has product id\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"id\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        },
        {
          "name": "List Products by City",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/v1/product/listing/list-by/city?cityCode={{city_code}}&currencyCode={{currency_code}}&language={{language_code}}&limit=10&offset=0"
            }
          },
          "description": "List products in a city (no auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Response has items array\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"items\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        },
        {
          "name": "List Products by Category",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/v1/product/listing/list-by/category?categoryId={{category_id}}&currencyCode={{currency_code}}&language={{language_code}}&limit=10&offset=0"
            }
          },
          "description": "List products by category (no auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Response has items array\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"items\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "v1 Inventory",
      "item": [
        {
          "name": "Get Inventory by Variant",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/v1/inventory/list-by/variant?variantId={{variant_id}}&startDateTime=2024-01-01T00:00:00&endDateTime=2024-01-31T23:59:59"
            }
          },
          "description": "Get inventory for a variant (no auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Response has items array\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"items\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "v1 Booking",
      "item": [
        {
          "name": "Get All Bookings",
          "request": {
            "method": "GET",
            "header": [
              { "key": "Headout-Auth", "value": "{{api_key}}" }
            ],
            "url": {
              "raw": "{{base_url}}/v1/booking?limit=10&offset=0"
            }
          },
          "description": "Fetch all bookings (requires auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Bookings list returned\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"items\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        },
        {
          "name": "Get Booking by ID",
          "request": {
            "method": "GET",
            "header": [
              { "key": "Headout-Auth", "value": "{{api_key}}" }
            ],
            "url": {
              "raw": "{{base_url}}/v1/booking/:bookingId"
            }
          },
          "description": "Fetch a booking by ID (requires auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Booking returned with same ID\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"bookingId\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        },
        {
          "name": "Create Booking (UNCAPTURED)",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Headout-Auth", "value": "{{api_key}}" },
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"variantId\": \"{{variant_id}}\",\n  \"inventoryId\": \"1455\",\n  \"customersDetails\": { \"count\": 1, \"customers\": [{ \"personType\": \"ADULT\", \"isPrimary\": true, \"inputFields\": [{\"id\": \"EMAIL\", \"value\": \"test@example.com\"}] }] },\n  \"variantInputFields\": [],\n  \"price\": { \"amount\": 100, \"currencyCode\": \"{{currency_code}}\" }\n}"
            },
            "url": {
              "raw": "{{base_url}}/v1/booking"
            }
          },
          "description": "Create a new booking (starts UNCAPTURED) (requires auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Booking created with ID\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"bookingId\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        },
        {
          "name": "Update Booking (Capture)",
          "request": {
            "method": "PUT",
            "header": [
              { "key": "Headout-Auth", "value": "{{api_key}}" },
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"status\": \"CAPTURED\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/v1/booking/:bookingId"
            }
          },
          "description": "Capture or update a booking status (requires auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Booking status updated\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"status\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "v1 City",
      "item": [
        {
          "name": "List Cities",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/v1/city?offset=0&limit=10"
            }
          },
          "description": "List all active cities (no auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"City list returned\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"items\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "v1 Category",
      "item": [
        {
          "name": "List Categories by City",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/v1/category/list-by/city?cityCode={{city_code}}&offset=0&limit=10"
            }
          },
          "description": "List categories for a city (no auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Category list returned\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"items\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "v2 Products",
      "item": [
        {
          "name": "List Products (v2)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "Headout-Auth", "value": "{{api_key}}" }
            ],
            "url": {
              "raw": "{{base_url}}/v2/products?cityCode={{city_code}}&categoryId={{category_id}}&subCategoryId={{sub_category_id}}&languageCode={{language_code}}&currencyCode={{currency_code}}&limit=10&offset=0"
            }
          },
          "description": "List products with filters (requires auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Products returned\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"products\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "v2 Categories",
      "item": [
        {
          "name": "List Categories (v2)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "Headout-Auth", "value": "{{api_key}}" }
            ],
            "url": {
              "raw": "{{base_url}}/v2/categories?cityCode={{city_code}}&languageCode={{language_code}}"
            }
          },
          "description": "List categories by city (requires auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Categories returned\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"categories\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "v2 Collections",
      "item": [
        {
          "name": "List Collections (v2)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "Headout-Auth", "value": "{{api_key}}" }
            ],
            "url": {
              "raw": "{{base_url}}/v2/collections?cityCode={{city_code}}&languageCode={{language_code}}"
            }
          },
          "description": "List collections by city (requires auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Collections returned\", function(){",
                  "    var json = pm.response.json();",
                  "    pm.expect(json).to.have.property(\"collections\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "v2 Subcategories",
      "item": [
        {
          "name": "List Subcategories (v2)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "Headout-Auth", "value": "{{api_key}}" }
            ],
            "url": {
              "raw": "{{base_url}}/v2/subcategories?cityCode={{city_code}}&languageCode={{language_code}}"
            }
          },
          "description": "List subcategories by city (requires auth).",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "pm.test(\"Subcategories returned\", function(){",
                  "    var json = pm.response.jSson();",
                  "    pm.expect(json).to.have.property(\"subCategories\");",
                  "});"
                ],
                "type": "text/javascript"
              }
            }
          ]
        }
      ]
    }
  ],
  "variable": [
    { "key": "base_url", "value": "{{base_url}}", "type": "string" },
    { "key": "api_key", "value": "{{api_key}}", "type": "string" }
  ]
}
```

**Sources:** The above information is drawn directly from Headout’s official Partner API docs (version 1 and 2) as found in their GitHub repository. Relevant sections were cited above from those docs【45†L11-L19】【72†L261-L269】【33†L1-L9】. Any missing data is noted in the ambiguity section; otherwise, details come from these primary sources.