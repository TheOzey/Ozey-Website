# EMULATOR-ONLY: fake Google sign-in against the Auth emulator (port 9299); prints the Firebase ID token.
import json, sys, urllib.parse, urllib.request
email = sys.argv[1]
idp = json.dumps({"sub": "g-" + email, "email": email, "email_verified": True})
body = json.dumps({"postBody": "id_token=" + urllib.parse.quote(idp) + "&providerId=google.com",
                   "requestUri": "http://localhost", "returnSecureToken": True}).encode()
req = urllib.request.Request("http://127.0.0.1:9299/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key",
                             data=body, headers={"Content-Type": "application/json"})
print(json.load(urllib.request.urlopen(req)).get("idToken", ""))
