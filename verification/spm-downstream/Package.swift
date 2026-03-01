// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SPMDownstreamTest",
    platforms: [.iOS(.v14)],
    dependencies: [
        .package(path: "../../"),
        .package(name: "dust-core-swift", path: "../../../dust-core-swift"),
    ],
    targets: [
        .target(
            name: "SPMDownstreamTest",
            dependencies: [
                .product(name: "DustCapacitorCore", package: "capacitor-core"),
                .product(name: "DustCore", package: "dust-core-swift"),
            ],
            path: "Sources"
        )
    ]
)
