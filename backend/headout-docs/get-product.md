> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Get product by ID

Retrieve full details for a single product by its ID, including all variants, pricing, images, content, location, and input fields required for booking. Optionally localize the response by specifying a language code and currency.

<RequestExample>
  ```bash cURL theme={"theme":{"light":"github-light","dark":"github-dark"}}
  curl --location 'https://www.headout.com/api/public/v2/products/<PRODUCT_ID>/?campaignName=<CAMPAIGN_NAME>&languageCode=<LANGUAGE_CODE>&currencyCode=<CURRENCY_CODE>' \
  --header 'Headout-Auth: <YOUR_API_KEY>'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "id": "19513",
    "name": "Edge Observation Deck Tickets",
    "canonicalUrl": "https://www.headout.com/edge-observation-deck-tickets/tickets-to-edge-observation-deck-e-19513/",
    "city": {
      "code": "NEW_YORK",
      "name": "New York",
      "image": {
        "url": "//cdn-imgix.headout.com/media/images/ee075882083344be170ed38c8c76b4a1-new-york-city-01.jpeg"
      }
    },
    "media": [
      {
        "url": "https://cdn-imgix.headout.com/media/images/7dff2143faf0c49109d1aeca8a7dcd9f-19513-new-york-edge-observation-deck-adimssion-tickets--09.jpg",
        "type": "IMAGE"
      }
    ],
    "startLocation": {
      "latitude": 40.753395080566406,
      "longitude": -74.00105285644531
    },
    "productType": "ATTRACTION",
    "reviewsSummary": {
      "ratingsCount": 5743,
      "averageRating": 4.4
    },
    "pricing": {
      "currency": "USD",
      "profileType": "PER_PERSON",
      "headoutSellingPrice": 39.2,
      "netPrice": 32.14
    },
    "listingPrice": {
      "type": "PER_PERSON",
      "currencyCode": "USD",
      "minimumPrice": {
        "originalPrice": 39.2,
        "finalPrice": 39.2
      },
      "bestDiscount": 0
    },
    "currency": {
      "code": "USD",
      "currencyName": "United States Dollar",
      "symbol": "US$",
      "localSymbol": "$",
      "precision": 2
    },
    "hasInstantConfirmation": true,
    "hasMobileTicket": true,
    "primaryCategory": {
      "id": "1",
      "name": "Tickets"
    },
    "primarySubCategory": {
      "id": "1007",
      "name": "Landmarks",
      "categoryId": "1"
    },
    "primaryCollection": {
      "id": "4012",
      "name": "Edge NYC",
      "cityCode": "NEW_YORK"
    },
    "variants": [
      {
        "id": "38164",
        "name": "General Admission: Timed Entry",
        "description": "Entry to Edge Observatory Deck at the time slot selected",
        "duration": 60000,
        "inventoryType": "FIXED_START_FLEXIBLE_DURATION",
        "pax": {
          "min": 1,
          "max": 10
        },
        "cashback": {
          "value": 0,
          "type": "ABSOLUTE"
        },
        "ticketDeliveryInfoHtml": null,
        "inputFields": [
          {
            "id": "NAME",
            "name": "Full Name",
            "dataType": "STRING",
            "level": "PRIMARY_CUSTOMER"
          }
        ],
        "tags": [
          "RECOMMENDED"
        ],
        "pricing": {
          "currency": "USD",
          "profileType": "PER_PERSON",
          "headoutSellingPrice": 39.2,
          "netPrice": 32.14
        }
      }
    ],
    "inventorySelectionType": "NORMAL",
    "cancellationPolicy": {
      "cancellable": false,
      "cancellableUpToInMinutes": null
    },
    "reschedulePolicy": {
      "reschedulable": false,
      "reschedulableUpToInMinutes": null
    }
  }
  ```
</ResponseExample>


## OpenAPI

````yaml specs/openapi-v2-api-partner.yaml GET /api/public/v2/products/{productId}/
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
  /api/public/v2/products/{productId}/:
    get:
      tags:
        - Products
      summary: Get product by ID
      operationId: v2GetProductById
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: string
          description: ID of the product to fetch.
        - $ref: '#/components/parameters/languageCode'
        - $ref: '#/components/parameters/currencyCode'
        - $ref: '#/components/parameters/campaignName'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2ProductById'
      security:
        - apiKeyAuth: []
components:
  parameters:
    languageCode:
      name: languageCode
      in: query
      schema:
        type: string
        default: EN
        enum:
          - EN
          - ES
          - FR
          - IT
          - DE
          - PT
          - NL
          - PL
          - KO
          - JA
          - ZH_HANS
          - ZH_HANT
          - AR
          - DA
          - false
          - RO
          - RU
          - SV
          - TR
      description: >-
        Language code for localizing response content including product names,
        descriptions, and URLs. Defaults to English (`EN`). Content falls back
        to English when a translation is unavailable. See [supported language
        codes](/guide/enums-and-error-codes#language-codes).
    currencyCode:
      name: currencyCode
      in: query
      schema:
        type: string
      description: >-
        Currency code for displaying prices (e.g., `USD`, `EUR`, `GBP`). All
        price fields in the response will use this currency. See [Currency
        Codes](/guide/enums-and-error-codes#currency-codes).
    campaignName:
      name: campaignName
      in: query
      schema:
        type: string
      description: >-
        Partner-specific campaign identifier for tracking conversions and
        attributing bookings to marketing campaigns.
  schemas:
    V2ProductById:
      description: >-
        Full product details including all variants, pricing, content, and
        media. Variants in this response include a pricing field.
      allOf:
        - $ref: '#/components/schemas/Product'
        - type: object
          properties:
            address:
              oneOf:
                - $ref: '#/components/schemas/LocationDetails'
                - type: 'null'
              description: Primary location details for the experience, when available.
            pois:
              type:
                - array
                - 'null'
              description: Points of interest associated with this product.
              items:
                type: object
                properties:
                  name:
                    type: string
                    description: Name of the point of interest.
                  operatingSchedules:
                    type: array
                    description: Operating schedule windows for this point of interest.
                    items:
                      type: object
                      properties:
                        startDate:
                          type: string
                          format: date
                          description: Start date for this operating window.
                        endDate:
                          type: string
                          format: date
                          description: End date for this operating window.
                        scheduleName:
                          type: string
                          description: Human-readable schedule name.
                        operatingDaySchedules:
                          type: array
                          items:
                            type: object
                            properties:
                              dayOfWeek:
                                type: string
                                description: Day of week for this operating schedule entry.
                              openingTime:
                                type:
                                  - string
                                  - 'null'
                                description: Opening time in HH:mm format.
                              closingTime:
                                type:
                                  - string
                                  - 'null'
                                description: Closing time in HH:mm format.
                              lastEntryTime:
                                type:
                                  - string
                                  - 'null'
                                description: Last entry time in HH:mm format.
                              closed:
                                type: boolean
                                description: >-
                                  Whether the point of interest is closed on
                                  this day.
                  holidays:
                    type: array
                    description: >-
                      Dates when the point of interest is closed or affected by
                      a holiday schedule.
                    items:
                      type: string
                      format: date
                  freeEntryDays:
                    type: array
                    description: Dates when entry is free.
                    items:
                      type: string
                      format: date
            cutoffTimeInMinutes:
              type:
                - integer
                - 'null'
              description: >-
                Booking cutoff time in minutes before visit time, when
                applicable.
            variants:
              type: array
              items:
                type: object
                properties:
                  pricing:
                    $ref: '#/components/schemas/ProductPricing'
                    description: >-
                      Pricing information for this variant. Values represent the
                      minimum across all inventories of that variant.
                  startingHeadoutSellingPrice:
                    type:
                      - object
                      - 'null'
                    description: >-
                      The minimum Headout selling price for this variant,
                      including the currency code used for that amount.
                    properties:
                      amount:
                        type:
                          - number
                          - 'null'
                        format: double
                        description: Minimum Headout selling amount for this variant.
                      currencyCode:
                        type: string
                        description: Currency code for the starting Headout selling price.
    Product:
      type: object
      properties:
        id:
          type: string
          description: >-
            Headout's unique product identifier. Use this to fetch full product
            details via the `getProductById` endpoint.
        name:
          type: string
          description: >-
            Display name of the experience (e.g., "Skip-the-Line Tickets to the
            Eiffel Tower").
        canonicalUrl:
          type: string
          description: >-
            The canonical Headout URL for this product page. Use for linking and
            affiliate tracking.
        content:
          $ref: '#/components/schemas/ProductContent'
          description: >-
            Editorial content for the product including highlights, summary,
            inclusions, and exclusions.
        city:
          $ref: '#/components/schemas/City'
          description: The city where this experience takes place.
        media:
          type: array
          items:
            $ref: '#/components/schemas/MediaDetails'
          description: >-
            Product images and videos for display in listings and product detail
            pages.
        startLocation:
          $ref: '#/components/schemas/LocationDetails'
          description: >-
            Coordinates and address details of the meeting/departure point for
            this experience.
        endLocation:
          $ref: '#/components/schemas/LocationDetails'
          description: >-
            Coordinates and address details of the drop-off/end point for this
            experience.
        productType:
          type: string
          enum:
            - TOUR
            - ACTIVITY
            - EVENT
            - ATTRACTION
            - TRANSFER
            - AIRPORT_TRANSFER
            - ADD_ON
          description: Experience category. Useful for filtering and display logic.
        reviewsSummary:
          $ref: '#/components/schemas/ReviewDetails'
          description: Aggregated rating and review count from verified Headout customers.
        pricing:
          $ref: '#/components/schemas/ProductPricing'
          description: >
            Canonical pricing object. Use this for all display and
            starting-price decisions.


            At the product level, values represent the minimum bookable price
            across all variants and time slots — i.e. the "from" / starting
            price. Even a single-variant product can vary by date because
            time-slot and supplier inventory pricing changes; treat this as the
            lowest currently-known starting point, not a fixed quote. Use
            `inventory.pricing` for live, bookable totals.
        listingPrice:
          $ref: '#/components/schemas/ListingPrice'
          deprecated: true
          description: >
            Deprecated. Use `pricing` instead for the starting "from" price.
            Retained on the response for backward compatibility and will not be
            removed, but should not be used in new integrations.
        currency:
          $ref: '#/components/schemas/Currency'
          description: Currency in which all prices in this response are denominated.
        localeSpecificUrls:
          type: object
          additionalProperties:
            type: string
          description: >-
            Localized product page URLs keyed by language code (`EN`, `ES`,
            `FR`, etc.), for use in multilingual storefronts.
        hasInstantConfirmation:
          type: boolean
          description: >-
            Whether bookings for this product are confirmed immediately without
            manual review.
        hasMobileTicket:
          type: boolean
          description: >-
            Whether this product supports mobile/digital tickets (no print
            required).
        primaryCategory:
          type: object
          description: >-
            The main experience category this product belongs to (e.g., Tickets,
            Tours).
          properties:
            id:
              type: string
              description: Headout's identifier for this category.
            name:
              type: string
              description: Display name of the category.
            canonicalUrl:
              type: string
              description: >-
                The canonical Headout URL for this category page, suitable for
                linking and SEO.
            localeSpecificUrls:
              type: object
              additionalProperties:
                type: string
              description: Localized URLs for this category page, keyed by language code.
        primarySubCategory:
          $ref: '#/components/schemas/V2SubCategory'
          description: >-
            The subcategory within the primary category (e.g., Museums,
            Landmarks under Tickets).
        primaryCollection:
          $ref: '#/components/schemas/V2Collection'
          description: >-
            The primary themed collection grouping this product (e.g., Empire
            State Building, Broadway Shows).
        variants:
          type: array
          items:
            type: object
            description: >-
              A bookable option within the product (e.g., different seating
              tiers, admission levels, or time slots).
            properties:
              id:
                oneOf:
                  - type: string
                  - type: integer
                description: >-
                  Variant identifier. Use as `variantId` when fetching inventory
                  or creating a booking.
              name:
                type:
                  - string
                  - 'null'
                description: >-
                  Display name of this variant option (e.g., "Rear Orchestra",
                  "Standard Admission"). Null or empty when the product has only
                  one variant — in that case the variant carries no special
                  distinguishing label.
              description:
                type:
                  - string
                  - 'null'
                description: >-
                  Additional details about what distinguishes this variant from
                  others.
              duration:
                type:
                  - number
                  - 'null'
                format: double
                description: >-
                  Duration of the experience in milliseconds.

                  Null for `FIXED_START_FLEXIBLE_DURATION` and
                  `FLEXIBLE_START_FLEXIBLE_DURATION` inventory types, where the
                  duration is open-ended.
              inventoryType:
                type: string
                enum:
                  - FIXED_START_FIXED_DURATION
                  - FIXED_START_FLEXIBLE_DURATION
                  - FLEXIBLE_START_FIXED_DURATION
                  - FLEXIBLE_START_FLEXIBLE_DURATION
                description: >-
                  How inventory slots are structured for this variant. Affects
                  how `startDateTime` and `endDateTime` should be interpreted.
                  See [Inventory
                  Types](/guide/enums-and-error-codes#inventory-types).

                  - `FIXED_START_FIXED_DURATION`: Fixed entry time and fixed
                  duration (e.g., a Broadway show at 7 PM).

                  - `FIXED_START_FLEXIBLE_DURATION`: Fixed entry time, customer
                  stays as long as they wish (e.g., a timed-entry observation
                  deck).

                  - `FLEXIBLE_START_FIXED_DURATION`: Open-window entry, fixed
                  duration once started (e.g., a 1-hour balloon ride during a
                  morning window).

                  - `FLEXIBLE_START_FLEXIBLE_DURATION`: Open entry, open-ended
                  duration (e.g., a theme park day pass).
              pax:
                type: object
                description: Allowed booking party size for this variant.
                properties:
                  min:
                    type: integer
                    description: >-
                      Minimum number of people required per booking. 0 means no
                      minimum.
                  max:
                    type:
                      - integer
                      - 'null'
                    description: >-
                      Maximum number of people allowed per booking. Null means
                      no upper limit.
              cashback:
                type: object
                description: Cashback incentive offered on bookings of this variant.
                properties:
                  value:
                    type: number
                    format: double
                    description: >-
                      Cashback amount or percentage, depending on the type
                      field.
                  type:
                    type: string
                    enum:
                      - PERCENTAGE
                      - ABSOLUTE
                    description: How the cashback is calculated.
              ticketDeliveryInfoHtml:
                type:
                  - string
                  - 'null'
                description: >-
                  HTML-formatted instructions on how tickets will be delivered
                  (e.g., email, mobile app, on-site collection).
              cancellationPolicy:
                type: object
                description: Cancellation policy specific to this variant.
                properties:
                  cancellable:
                    type: boolean
                    description: Whether this variant can be cancelled after booking.
                  cancellableUpTo:
                    type:
                      - integer
                      - 'null'
                    description: >-
                      How far in advance, in minutes, the booking can be
                      cancelled.
              meetingPointInfo:
                type:
                  - object
                  - 'null'
                description: Meeting point information for this variant.
                properties:
                  latitude:
                    type:
                      - string
                      - 'null'
                    description: Latitude coordinate as returned by the API.
                  longitude:
                    type:
                      - string
                      - 'null'
                    description: Longitude coordinate as returned by the API.
                  address:
                    type:
                      - string
                      - 'null'
                    description: Human-readable meeting point address.
              properties:
                type: object
                additionalProperties:
                  type: string
                description: Additional variant properties keyed by arbitrary strings.
              propertiesV2:
                type: object
                additionalProperties:
                  type: array
                  items:
                    type: string
                description: >-
                  Additional variant properties in the newer format, keyed by
                  arbitrary strings with string arrays as values.
              inputFields:
                type: array
                items:
                  $ref: '#/components/schemas/VariantInputField'
                  description: >-
                    A field that must be collected from the customer when
                    creating a booking for this variant.
              tags:
                type: array
                items:
                  type: string
                description: >-
                  Internal classification tags for this variant (e.g.,
                  `BROADWAY`, `BTTFA`). Used for eligibility programs and
                  internal routing.
        inventorySelectionType:
          type: string
          enum:
            - NORMAL
            - SEATMAP
          description: >-
            Inventory selection flow for this product. Determines how date/time
            selection should be presented to users.
        cancellationPolicy:
          type: object
          description: >-
            Strictest cancellation policy applicable across all variants of this
            product.
          properties:
            cancellable:
              type: boolean
              description: Whether this product can be cancelled after booking.
            cancellableUpToInMinutes:
              type:
                - integer
                - 'null'
              description: >
                Cancellation cutoff in minutes before the experience start time.
                Cancellation requests submitted after this cutoff are not
                accepted. Null if the product is not cancellable.


                This field defines cancellation eligibility only. Refund
                handling is a separate concern — see [Cancellation & reschedule
                policies](/guide/key-concepts#cancellation-%26-reschedule-policies).
        reschedulePolicy:
          type: object
          description: >-
            Strictest reschedule policy applicable across all variants of this
            product.
          properties:
            reschedulable:
              type: boolean
              description: Whether this product can be rescheduled after booking.
            reschedulableUpToInMinutes:
              type:
                - integer
                - 'null'
              description: >-
                How far in advance (in minutes before start time) the booking
                can be rescheduled. Null if the product is not reschedulable.
    LocationDetails:
      allOf:
        - $ref: '#/components/schemas/Geolocation'
        - type: object
          properties:
            address:
              type:
                - string
                - 'null'
              description: Street-level address of the location (e.g., "1 West 34th St").
            city:
              type:
                - string
                - 'null'
              description: City name where this location resides.
            postalCode:
              type:
                - string
                - 'null'
              description: Postal or ZIP code of the location.
            country:
              type:
                - string
                - 'null'
              description: Country name where this location resides.
    ProductPricing:
      allOf:
        - $ref: '#/components/schemas/ProductPricingApiPartner'
      description: >-
        Pricing information for API Partner accounts. Currency defaults to USD
        if `currencyCode` is not provided in the request query parameter.
    ProductContent:
      type: object
      properties:
        highlights:
          type: string
          description: >-
            Key selling points and notable features of the experience, typically
            displayed as a bullet list.
        highlightsHtml:
          type:
            - string
            - 'null'
          description: HTML-formatted version of `highlights`. Use for rich text rendering.
        shortSummary:
          type: string
          description: >-
            Brief overview of the experience, suitable for product cards and
            listing previews.
        summaryHtml:
          type:
            - string
            - 'null'
          description: >-
            HTML-formatted version of `shortSummary`. Use for rich text
            rendering.
        inclusions:
          type: string
          description: >-
            What is included in the price (e.g., "Skip-the-line access", "Guided
            tour", "Hotel pickup").
        inclusionsHtml:
          type:
            - string
            - 'null'
          description: HTML-formatted version of `inclusions`. Use for rich text rendering.
        exclusions:
          type: string
          description: >-
            What is not included (e.g., "Gratuities", "Food and drinks", "Hotel
            transfers").
        exclusionsHtml:
          type:
            - string
            - 'null'
          description: HTML-formatted version of `exclusions`. Use for rich text rendering.
        faqHtml:
          type:
            - string
            - 'null'
          description: >-
            HTML-formatted FAQ content for the experience. Null if no FAQ is
            available.
        ticketDeliveryInfoHtml:
          type:
            - string
            - 'null'
          description: >-
            HTML-formatted instructions on how tickets will be delivered (e.g.,
            email, mobile app, on-site collection).
    City:
      type: object
      properties:
        code:
          type: string
          description: >-
            City code (e.g., `NEW_YORK`, `DUBAI`, `LONDON`). Use this as the
            `cityCode` parameter in other endpoints. See [Cities
            API](/api-partner/v2/cities).
        name:
          type: string
          description: Display name of the city.
        image:
          $ref: '#/components/schemas/Image'
          description: City image suitable for navigation or city selection UI.
    MediaDetails:
      type: object
      properties:
        url:
          type: string
          description: >-
            CDN URL for this media asset. Supports imgix query parameters for
            on-the-fly resizing and format conversion.
        type:
          type: string
          enum:
            - IMAGE
            - VIDEO
            - PDF
          description: Media asset type.
    ReviewDetails:
      type: object
      properties:
        ratingsCount:
          type: integer
          description: >-
            Total number of verified customer ratings submitted for this
            product.
        averageRating:
          type: number
          format: double
          description: >-
            Mean customer rating on a scale of 1-5, based on verified
            post-experience reviews.
    ListingPrice:
      type: object
      deprecated: true
      description: >
        Deprecated. Use `pricing` (product-level for the starting "from" price,
        variant-level for variant-specific values). Retained for backward
        compatibility.
      properties:
        type:
          type: string
          enum:
            - PER_PERSON
            - PER_GROUP
          description: >-
            Pricing model for this product. See [Listing Price
            Types](/guide/enums-and-error-codes#listing-price-types).

            - `PER_PERSON`: price per individual — inventory returns person
            types (Adult, Child, etc.) each with their own price.

            - `PER_GROUP`: single price for a group — inventory returns pricing
            tiers by group size.
        currencyCode:
          type: string
          description: >-
            Currency code for all price values in this object. See [Currency
            Codes](/guide/enums-and-error-codes#currency-codes).
        minimumPrice:
          $ref: '#/components/schemas/Price'
          description: >-
            Lowest available price across all variants and person types.
            Deprecated — use `pricing` for the starting "from" price.
        bestDiscount:
          type: number
          format: double
          description: >-
            Highest discount percentage available across all variants, for
            displaying promotional badges.
    Currency:
      type: object
      properties:
        code:
          type: string
          description: >-
            Currency code (e.g., `USD`, `EUR`, `AED`). See [Currency
            Codes](/guide/enums-and-error-codes#currency-codes).
        currency:
          type: string
          description: >-
            Currency code repeated in the payload for backward compatibility
            with the partner model.
        currencyName:
          type: string
          description: Full name of the currency (e.g., "United States Dollar", "Euro").
        symbol:
          type: string
          description: International currency symbol (e.g., "US$", "EUR").
        localSymbol:
          type: string
          description: >-
            Locally preferred symbol for this currency (e.g., "$" for USD in the
            US).
        precision:
          type: integer
          description: >-
            Number of decimal places used for this currency (e.g., 2 for USD, 0
            for JPY).
    V2SubCategory:
      type: object
      properties:
        id:
          type: string
          description: >-
            Headout's identifier for this subcategory. Use as the
            `subCategoryId` filter in the [Products
            API](/api-partner/v2/products).
        name:
          type: string
          description: >-
            Display name of the subcategory (e.g., "Museums", "Landmarks",
            "Religious Sites").
        categoryId:
          type: string
          description: Identifier of the parent category this subcategory belongs to.
        canonicalUrl:
          type: string
          description: >-
            The canonical Headout URL for this subcategory page, suitable for
            linking and SEO.
        localeSpecificUrls:
          type: object
          additionalProperties:
            type: string
          description: >-
            Localized subcategory page URLs keyed by language code (`EN`, `ES`,
            `FR`, etc.).
    V2Collection:
      type: object
      properties:
        id:
          type: string
          description: >-
            Headout's identifier for this collection. Use as the `collectionId`
            filter in the [Products API](/api-partner/v2/products).
        name:
          type: string
          description: >-
            Display name of the collection (e.g., "Broadway Shows", "Statue of
            Liberty").
        cityCode:
          type: string
          description: The city this collection belongs to (e.g., `NEW_YORK`, `LONDON`).
        content:
          type:
            - object
            - 'null'
          description: Editorial content for this collection.
          properties:
            description:
              type:
                - string
                - 'null'
              description: Long-form description of the collection.
            subtext:
              type:
                - string
                - 'null'
              description: Short subtext or tagline for the collection.
        localeSpecificUrls:
          type: object
          additionalProperties:
            type: string
          description: >-
            Localized collection page URLs keyed by language code (`EN`, `ES`,
            `FR`, etc.).
        canonicalUrl:
          type: string
          description: >-
            The canonical Headout URL for this collection page, suitable for
            linking and SEO.
        heroImage:
          type:
            - object
            - 'null'
          description: Hero/banner image for the collection.
          properties:
            url:
              type: string
              description: CDN URL for the image.
            type:
              type: string
              description: Media type (e.g., `IMAGE`).
        cardImage:
          type:
            - object
            - 'null'
          description: Card/thumbnail image for the collection.
          properties:
            url:
              type: string
              description: CDN URL for the image.
            type:
              type: string
              description: Media type (e.g., `IMAGE`).
    VariantInputField:
      type: object
      description: >-
        A field that must be collected from the customer when creating a booking
        for this variant.
      properties:
        oldId:
          type: integer
          description: Legacy numeric field identifier for backwards compatibility.
        id:
          type: string
          description: >-
            Field identifier used in the booking request (e.g., `NAME`, `EMAIL`,
            `PHONE`, or `CUSTOM_*`).
        name:
          type: string
          description: Human-readable label to display to the customer for this field.
        description:
          type: string
          description: Optional helper text or instructions shown for this field.
        dataType:
          type: string
          enum:
            - STRING
            - ENUM
            - BOOL
            - INT
            - FLOAT
            - LOCATION
          description: >-
            Expected data type for this field's value. See [Input Field Data
            Types](/guide/enums-and-error-codes#input-field-data-types).

            - `STRING`: free-form text — apply `regex`, `minLength`, `maxLength`
            from `validation`.

            - `ENUM`: one of the values in `validation.values` — value must be
            an exact match.

            - `BOOL`: boolean — submit as the string `"true"` or `"false"`.

            - `INT`: whole number — apply `minValue`, `maxValue` from
            `validation`.

            - `FLOAT`: decimal number — apply `minValue`, `maxValue` from
            `validation`.

            - `LOCATION`: pickup/drop-off location. If `validation.values` is
            non-empty, items are **predefined location objects** (see
            `PredefinedLocation` schema) — render as a dropdown and submit
            either the selected `id` or its `displayName`. If
            `validation.values` is null, accept a free-form address string.

            Note: there is no dedicated `DATE` dataType. Date and date-time
            fields (e.g. `DATE_OF_BIRTH_*`) are submitted as `STRING`, with the
            expected format enforced by `validation.regex` on the field.
        validation:
          $ref: '#/components/schemas/FieldValidation'
          description: >-
            Constraints that must be satisfied when submitting a value for this
            field.
        level:
          type: string
          enum:
            - PRIMARY_CUSTOMER
            - ALL_CUSTOMER
            - BOOKING
          description: >
            Who this field should be collected from. See [Input Field
            Level](/guide/enums-and-error-codes#input-field-level).


            - `PRIMARY_CUSTOMER`: collect once from the lead guest only (e.g.,
            name, email, phone). Submit inside the `isPrimary: true` customer's
            `inputFields`.

            - `ALL_CUSTOMER`: collect from every guest in the booking (e.g.,
            weight, height, meal preference). Submit inside every customer's
            `inputFields`.

            - `BOOKING`: collect once for the whole booking, not per customer
            (e.g., language preference, group name on the reservation, special
            accessibility request). Submit in the booking-level
            `variantInputFields` array — **not** inside any customer object.


            `level` and `dataType` are independent — a `BOOKING`-level field can
            be any dataType, and a `LOCATION` dataType field can be at any
            level.
    Geolocation:
      type: object
      properties:
        latitude:
          type: number
          format: double
          description: Latitude coordinate of the location in decimal degrees.
        longitude:
          type: number
          format: double
          description: Longitude coordinate of the location in decimal degrees.
    ProductPricingApiPartner:
      title: API Partner Pricing
      allOf:
        - $ref: '#/components/schemas/ProductPricingBase'
        - type: object
          properties:
            netPrice:
              type: number
              format: double
              description: Minimum partner net price.
    Image:
      type: object
      properties:
        url:
          type: string
          description: >-
            CDN URL for the image. Can be used with imgix parameters for
            resizing and format conversion.
    Price:
      type: object
      properties:
        originalPrice:
          type: number
          format: double
          description: >-
            Full undiscounted price. Suitable for displaying as a strikethrough
            price alongside the final price.
        finalPrice:
          type: number
          format: double
          description: >-
            Actual price after applying any discounts or promotions. This is the
            amount charged to the customer.
    FieldValidation:
      type: object
      properties:
        regex:
          type:
            - string
            - 'null'
          description: >-
            Regular expression pattern the submitted value must match. Null when
            not applicable (e.g., for non-string fields). Validate on the client
            before submission to avoid booking errors.
        minLength:
          type:
            - integer
            - 'null'
          description: >-
            Minimum number of characters required. Null when not applicable
            (e.g., for `INT`, `FLOAT`, `BOOL` fields).
        maxLength:
          type:
            - integer
            - 'null'
          description: >-
            Maximum number of characters allowed. Null when not applicable
            (e.g., for `INT`, `FLOAT`, `BOOL` fields).
        minValue:
          type:
            - number
            - 'null'
          format: double
          description: >-
            Minimum numeric value allowed. Null when not applicable (e.g., for
            `STRING`, `BOOL` fields).
        maxValue:
          type:
            - number
            - 'null'
          format: double
          description: >-
            Maximum numeric value allowed. Null when not applicable (e.g., for
            `STRING`, `BOOL` fields).
        required:
          type: boolean
          description: >-
            Whether this field must be provided in the booking request. If true,
            omitting it will cause the booking to fail.
        values:
          description: >-
            Predefined allowed values for this field. The shape of items depends
            on `inputFields.dataType`:

            - **`ENUM`**: `string[]` — the submitted value must exactly match
            one of these strings.

            - **`LOCATION`** (predefined): array of location objects — render as
            a dropdown and submit either the selected `id` or its `displayName`
            as the field value. See `PredefinedLocation` schema.

            - **All other types**: `null`.
          oneOf:
            - title: Enum Values
              type: array
              items:
                type: string
              description: String enum values (for `ENUM` dataType fields).
            - title: Predefined Locations
              type: array
              items:
                $ref: '#/components/schemas/PredefinedLocation'
              description: >-
                Predefined pickup/drop-off locations (for `LOCATION` dataType
                fields with predefined options).
            - type: 'null'
    ProductPricingBase:
      type: object
      properties:
        currency:
          type: string
          description: >-
            Currency code (e.g., USD, EUR). Defaults to USD if `currencyCode` is
            not provided in the request. See [Currency
            Codes](/guide/enums-and-error-codes#currency-codes).
        profileType:
          type: string
          enum:
            - PER_PERSON
            - PER_GROUP
          description: >-
            Pricing model for this product. See [Listing Price
            Types](/guide/enums-and-error-codes#listing-price-types).

            - `PER_PERSON`: price per individual — inventory returns person
            types (Adult, Child, etc.) each with their own price.

            - `PER_GROUP`: single price for a group — inventory returns pricing
            tiers by group size.
        headoutSellingPrice:
          type: number
          format: double
          description: Minimum Headout selling price.
    PredefinedLocation:
      type: object
      description: >-
        A predefined pickup or drop-off location for a `LOCATION` dataType input
        field.

        When `validation.values` contains objects of this type, render them as a
        dropdown.

        Submit either the selected location's `id` or its `displayName` as the
        input field value when creating a booking.
      properties:
        id:
          type: integer
          description: >-
            Unique identifier for this location. Submit this value or the
            location's `displayName` as the input field value when creating a
            booking.
        latitude:
          type: number
          format: double
          description: Latitude of the pickup/drop-off point in decimal degrees.
        longitude:
          type: number
          format: double
          description: Longitude of the pickup/drop-off point in decimal degrees.
        address:
          type: string
          description: >-
            Full street address of the location (e.g., "3600 S Las Vegas Blvd,
            Las Vegas, NV 89109, USA").
        displayName:
          type: string
          description: >-
            Short human-readable label for display in a dropdown or list (e.g.,
            "Bellagio").
        timingConfig:
          $ref: '#/components/schemas/LocationTimingConfig'
          description: Optional pickup timing constraints for this location.
        note:
          type:
            - object
            - 'null'
          description: >-
            Additional instructions for this pickup location. Null if no note
            exists.
          properties:
            content:
              type:
                - string
                - 'null'
              description: >-
                The note text (e.g., "Meet at the main entrance, not the side
                entrance.").
            language:
              type: string
              description: Language code for the note content (e.g., `EN`, `ES`).
    LocationTimingConfig:
      type: object
      description: >-
        Pickup timing constraints for a predefined location. All fields are
        nullable — null means no restriction applies.
      properties:
        startTime:
          type:
            - string
            - 'null'
          description: >-
            Earliest allowed pickup time in HH:mm format (e.g., `10:30`). Null
            if no earliest restriction.
        endTime:
          type:
            - string
            - 'null'
          description: >-
            Latest allowed pickup time in HH:mm format (e.g., `11:00`). Null if
            no latest restriction.
        minPeriod:
          type:
            - integer
            - 'null'
          description: >-
            Minimum advance notice required for this pickup, in minutes. Null if
            no minimum notice.
        maxPeriod:
          type:
            - integer
            - 'null'
          description: >-
            Maximum advance booking window for this pickup, in minutes. Null if
            no maximum window.
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: Headout-Auth

````