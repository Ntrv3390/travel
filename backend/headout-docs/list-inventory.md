> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# List inventory - Normal

For products with `inventorySelectionType: NORMAL`. Retrieve available time slots and pricing for a specific tour within a date range. Returns inventory items with `startDateTime`/`endDateTime`, availability status, remaining capacity, and per-person or group pricing tiers (Adult, Child, Student, etc.). Use this to display bookable slots and prices to users before creating a booking.

<RequestExample>
  ```bash cURL theme={"theme":{"light":"github-light","dark":"github-dark"}}
  curl --location 'https://www.headout.com/api/public/v2/inventory/list-by/tour/?tourId=52850&startDateTime=2025-07-25T00%3A00&endDateTime=2025-07-27T00%3A00&currencyCode=EUR&offset=0&limit=1' \
  --header 'Headout-Auth: <YOUR_API_KEY>'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "items": [
      {
        "id": "520436588",
        "startDateTime": "2026-03-26T10:00:00",
        "endDateTime": "2026-03-26T19:00:00",
        "availability": "LIMITED",
        "remaining": 14,
        "pricing": {
          "persons": [
            {
              "type": "ADULT",
              "name": "Adult",
              "description": null,
              "ageFrom": 13,
              "ageTo": 64,
              "price": 48.99,
              "originalPrice": 48.99,
              "netPrice": 48.99,
              "headoutSellingPrice": 48.99,
              "remaining": 14,
              "availability": "LIMITED",
              "paxRange": {
                "min": null,
                "max": null
              }
            },
            {
              "type": "CHILD",
              "name": "Child",
              "description": null,
              "ageFrom": 4,
              "ageTo": 12,
              "price": 38.11,
              "originalPrice": 38.11,
              "netPrice": 38.11,
              "headoutSellingPrice": 38.11,
              "remaining": 14,
              "availability": "LIMITED",
              "paxRange": {
                "min": null,
                "max": null
              }
            },
            {
              "type": "SENIOR",
              "name": "Senior",
              "description": null,
              "ageFrom": 65,
              "ageTo": 99,
              "price": 38.11,
              "originalPrice": 38.11,
              "netPrice": 38.11,
              "headoutSellingPrice": 38.11,
              "remaining": 14,
              "availability": "LIMITED",
              "paxRange": {
                "min": null,
                "max": null
              }
            }
          ],
          "groups": []
        }
      }
    ],
    "nextUrl": "https://www.headout.com/api/public/v2/inventory/list-by/tour?tourId=82665&startDateTime=2026-03-26T00%3A00&endDateTime=2026-03-28T00%3A00&currencyCode=USD&offset=1&limit=1",
    "prevUrl": null,
    "total": 2,
    "nextOffset": 1
  }
  ```
</ResponseExample>


## OpenAPI

````yaml GET /api/public/v2/inventory/list-by/tour/
openapi: 3.1.0
info:
  title: Headout API Docs - API Partner v2
  version: 0.0.1
servers:
  - url: https://www.headout.com
    description: Production server
  - url: https://www.sandbox-headout.com
    description: Sandbox server
security: []
paths:
  /api/public/v2/inventory/list-by/tour/:
    get:
      tags:
        - Inventory
      summary: List inventory - Normal
      operationId: v2ListInventoryByTour
      parameters:
        - name: tourId
          in: query
          required: true
          schema:
            type: string
          description: >-
            Unique identifier of the tour/product variant to fetch inventory
            for. Obtain this from the product variants in the [Products
            API](/api-partner/v2/products) response.
        - $ref: '#/components/parameters/currencyCodeRequired'
        - name: startDateTime
          in: query
          required: true
          schema:
            type: string
            format: date-time
          description: >-
            Beginning of the date range to fetch available slots (URL encoded).
            Example: `2025-07-25T00:00`. See [ISO
            8601](https://en.wikipedia.org/wiki/ISO_8601).
        - name: endDateTime
          in: query
          required: false
          schema:
            type: string
            format: date-time
          description: >-
            End of the date range to fetch available slots (URL encoded).
            Maximum range varies by product. See [ISO
            8601](https://en.wikipedia.org/wiki/ISO_8601).
        - $ref: '#/components/parameters/offset'
        - $ref: '#/components/parameters/limit'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2PaginatedInventory'
      security:
        - apiKeyAuth: []
components:
  parameters:
    currencyCodeRequired:
      name: currencyCode
      in: query
      required: true
      schema:
        type: string
      description: >-
        Currency code for displaying prices (e.g., `USD`, `EUR`, `GBP`). All
        price fields in the response will use this currency. See [Currency
        Codes](/guide/enums-and-error-codes#currency-codes).
    offset:
      name: offset
      in: query
      schema:
        type: integer
        default: 0
      description: >-
        Number of records to skip for pagination. Use with `limit` to paginate
        through large result sets. Start at `0` for the first page.
    limit:
      name: limit
      in: query
      schema:
        type: integer
        default: 10
      description: >-
        Maximum number of records to return per request. Use with `offset` to
        paginate through results. Check `nextOffset` in response for more pages.
  schemas:
    V2PaginatedInventory:
      type: object
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/V2Inventory'
          description: The inventory slots in this page of results.
        nextUrl:
          type:
            - string
            - 'null'
          description: >-
            Full URL to fetch the next page of results. Null if on the last
            page.
        prevUrl:
          type:
            - string
            - 'null'
          description: >-
            Full URL to fetch the previous page of results. Null if on the first
            page.
        total:
          type: integer
          description: Total number of available inventory slots across all pages.
        nextOffset:
          type:
            - integer
            - 'null'
          description: >-
            Offset value to use in the next request to retrieve the following
            page.
    V2Inventory:
      type: object
      properties:
        id:
          type: string
          description: >-
            Inventory slot identifier. Pass this as `inventoryId` when creating
            a booking.
        startDateTime:
          type: string
          format: date-time
          description: >-
            Start time for this slot in local time, no timezone offset (format
            `yyyy-MM-dd'T'HH:mm:ss`).

            Interpretation depends on the variant's `inventoryType`:

            - `FIXED_START_*`: the exact time the experience begins (e.g., show
            curtain time).

            - `FLEXIBLE_START_*`: the venue or window opening time — not a fixed
            entry time. The customer can arrive any time after this.
        endDateTime:
          type: string
          format: date-time
          description: >-
            End time for this slot in local time, no timezone offset (format
            `yyyy-MM-dd'T'HH:mm:ss`).

            Interpretation depends on the variant's `inventoryType`:

            - `FIXED_START_FIXED_DURATION`: the exact time the experience ends.

            - `FIXED_START_FLEXIBLE_DURATION` / `FLEXIBLE_START_*`: the venue or
            window closing time — the customer must depart by this time.
        availability:
          type: string
          enum:
            - LIMITED
            - UNLIMITED
            - CLOSED
          description: >-
            Availability status for this slot. See [Inventory
            Availability](/guide/enums-and-error-codes#inventory-availability).

            - `LIMITED`: limited spots — check `remaining` for the exact count.

            - `UNLIMITED`: no cap on bookings for this slot.

            - `CLOSED`: slot is unavailable and cannot be booked.
        remaining:
          type: integer
          description: >-
            Number of spots remaining. Relevant when `availability` is
            `LIMITED`; may be approximate.
        pricing:
          $ref: '#/components/schemas/V2InventoryPricing'
          description: >-
            Current pricing for this slot. Use these prices when constructing a
            booking request.
    V2InventoryPricing:
      type: object
      properties:
        persons:
          type: array
          description: >-
            Per-person pricing tiers. Populated only when the variant's
            `priceType` is `PER_PERSON`.

            Empty for `PER_GROUP` variants.
          items:
            $ref: '#/components/schemas/V2PersonPricing'
        groups:
          type: array
          description: >-
            Group pricing tiers. Populated only when the variant's `priceType`
            is `PER_GROUP`.

            Empty for `PER_PERSON` variants.
          items:
            type: object
            description: >-
              Group pricing tier (fixed price for a set group size, regardless
              of individual person types).
            properties:
              size:
                type: integer
                description: >-
                  Upper bound (inclusive) of the group size this tier applies
                  to. The lower bound is the `size` of the next smaller tier
                  plus one (or 1 if this is the smallest tier).

                  Example: tiers with sizes [4, 7, 10] mean: 1-4 people =
                  tier[0].price, 5-7 people = tier[1].price, 8-10 people =
                  tier[2].price.
              description:
                type:
                  - string
                  - 'null'
                description: Additional details about this group pricing tier.
              price:
                type: number
                format: double
                description: Current group price after any discounts.
              originalPrice:
                type: number
                format: double
                description: >-
                  Full group price before discounts. Useful for showing
                  strikethrough pricing.
              netPrice:
                type: number
                format: double
                description: >-
                  The net amount remitted to Headout after partner commission is
                  deducted.
              headoutSellingPrice:
                type: number
                format: double
                description: >-
                  The price at which Headout sells this experience on its own
                  channels. May differ from the partner price.
              remaining:
                type: integer
                description: Number of spots remaining for this group pricing tier.
              availability:
                type: string
                enum:
                  - LIMITED
                  - UNLIMITED
                  - CLOSED
                description: Availability status for this group pricing tier.
    V2PersonPricing:
      type: object
      properties:
        type:
          type: string
          description: >-
            Person category identifier (e.g., `ADULT`, `CHILD`, `STUDENT`). Use
            this as `personType` in the booking request.
        name:
          type: string
          description: >-
            Display label for this person type (e.g., "Adult", "Child",
            "Student").
        description:
          type:
            - string
            - 'null'
          description: >-
            Additional details about this person type (e.g., age restrictions or
            eligibility notes).
        ageFrom:
          type: integer
          description: Minimum age (inclusive) qualifying for this person type.
        ageTo:
          type:
            - integer
            - 'null'
          description: >-
            Maximum age (inclusive) qualifying for this person type. Null means
            no upper age limit.
        price:
          type: number
          format: double
          description: >-
            Current selling price per person after any discounts. Use this value
            in the booking request price.
        originalPrice:
          type: number
          format: double
          description: >-
            Full price before discounts. Useful for showing strikethrough
            pricing.
        netPrice:
          type: number
          format: double
          description: >-
            The net amount remitted to Headout after partner commission is
            deducted.
        headoutSellingPrice:
          type: number
          format: double
          description: >-
            The price at which Headout sells this experience on its own
            channels. May differ from the partner price.
        remaining:
          type: integer
          description: Number of spots remaining for this person type specifically.
        availability:
          type: string
          enum:
            - LIMITED
            - UNLIMITED
            - CLOSED
          description: Availability for this person type specifically.
        paxRange:
          type: object
          description: Allowed booking quantity range for this person type.
          properties:
            min:
              type:
                - integer
                - 'null'
              description: Minimum number of this person type required per booking.
            max:
              type:
                - integer
                - 'null'
              description: Maximum number of this person type allowed per booking.
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: Headout-Auth

````