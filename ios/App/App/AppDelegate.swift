import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Diagnostic build: enable Safari Web Inspector for TestFlight review.
        // isInspectable is a no-op on iOS < 16.4 and safe to leave enabled for
        // this temporary diagnostic build. Remove for production release.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            AppDelegate.enableWebViewInspection()
        }
        return true
    }

    /// Walks the view hierarchy from the root view controller down and sets
    /// `isInspectable = true` on every WKWebView it finds. This is Apple's
    /// official mechanism (introduced iOS 16.4) to allow Safari's Web
    /// Inspector to attach to a device build without a debug scheme.
    static func enableWebViewInspection() {
        if #available(iOS 16.4, *) {
            for scene in UIApplication.shared.connectedScenes {
                guard let windowScene = scene as? UIWindowScene else { continue }
                for window in windowScene.windows {
                    inspectRecursively(window.rootViewController?.view)
                }
            }
        }
    }

    @available(iOS 16.4, *)
    private static func inspectRecursively(_ view: UIView?) {
        guard let view = view else { return }
        if let webView = view as? WKWebView {
            webView.isInspectable = true
        }
        for sub in view.subviews {
            inspectRecursively(sub)
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Ensure the flag is (re)applied after the Capacitor bridge has
        // fully instantiated its WKWebView.
        AppDelegate.enableWebViewInspection()
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
