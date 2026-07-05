import Foundation
import AuthenticationServices
import Capacitor

/**
 * Native Sign in with Apple bridge.
 *
 * Exposed to JavaScript as `AppleSignIn.signIn({ nonce: <sha256-hex> })`
 * and returns `{ identityToken, email, givenName, familyName, user }`.
 *
 * The raw nonce is generated + kept on the JS side; only the SHA-256
 * hash is passed in and set on the Apple authorization request. The
 * JS caller passes the raw nonce back to Supabase together with the
 * identity token so Supabase can verify Apple's signature.
 *
 * Registered automatically because it conforms to `CAPBridgedPlugin`
 * (no plugin plist edits needed on Capacitor 6+).
 */
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin,
    ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding {

    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?

    @objc func signIn(_ call: CAPPluginCall) {
        guard let hashedNonce = call.getString("nonce"), !hashedNonce.isEmpty else {
            call.reject("Missing hashed nonce")
            return
        }

        self.pendingCall = call

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = hashedNonce

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self

        DispatchQueue.main.async {
            controller.performRequests()
        }
    }

    // MARK: - ASAuthorizationControllerDelegate

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let call = self.pendingCall else { return }
        self.pendingCall = nil

        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            call.reject("Invalid credential type")
            return
        }

        guard let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8),
              !identityToken.isEmpty else {
            call.reject("Missing identity token")
            return
        }

        let givenName = credential.fullName?.givenName ?? ""
        let familyName = credential.fullName?.familyName ?? ""
        let email = credential.email ?? ""

        call.resolve([
            "identityToken": identityToken,
            "email": email,
            "givenName": givenName,
            "familyName": familyName,
            "user": credential.user
        ])
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        guard let call = self.pendingCall else { return }
        self.pendingCall = nil

        let nsErr = error as NSError
        if nsErr.domain == ASAuthorizationError.errorDomain,
           nsErr.code == ASAuthorizationError.canceled.rawValue {
            call.reject("canceled", "canceled")
        } else {
            call.reject(nsErr.localizedDescription, String(nsErr.code))
        }
    }

    // MARK: - Presentation

    public func presentationAnchor(
        for controller: ASAuthorizationController
    ) -> ASPresentationAnchor {
        DispatchQueue.main.sync {
            self.bridge?.viewController?.view.window
                ?? UIApplication.shared.windows.first
                ?? ASPresentationAnchor()
        }
    }
}
