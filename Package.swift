// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "DustCoreCapacitor",
    platforms: [.iOS(.v14), .macOS(.v14)],
    products: [
        .library(
            name: "DustCoreCapacitor",
            targets: ["CorePlugin"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/rogelioRuiz/dust-core-swift.git", from: "0.1.0"),
    ],
    targets: [
        .target(
            name: "CorePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "DustCore", package: "dust-core-swift"),
            ],
            path: "ios/Sources/CorePlugin"
        )
    ]
)
