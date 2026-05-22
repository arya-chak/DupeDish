# DupeDish
Helping people make their favorite takeout dishes at home, cheaper

.env has:
Production
KROGER_CLIENT_ID
KROGER_CLIENT_SECRET

KROGER_LOCATION_ID

Cerification
KROGER_CLIENT_ID
KROGER_CLIENT_SECRET

SUPABASE_URL
SUPABASE_SERVICE_KEY

curl -H "Authorization: Bearer <prod_token>" \
  "https://api.kroger.com/v1/locations?filter.zipCode.near=75023&filter.limit=3"
