import Foundation
import Capacitor
@_exported import DustCore

@objc(CorePlugin)
public class CorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CorePlugin"
    public let jsName = "Core"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getContractVersion", returnType: CAPPluginReturnPromise),
    ]

    private static let contractVersion = DustCoreVersion.current

    @objc func getContractVersion(_ call: CAPPluginCall) {
        call.resolve(["version": Self.contractVersion])
    }
}
