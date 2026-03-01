require 'json'

package = JSON.parse(File.read(File.join(File.dirname(__FILE__), 'package.json')))

Pod::Spec.new do |s|
  s.name = 'DustCapacitorCore'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = 'https://github.com/rogelioRuiz/dust-core-capacitor'
  s.author = 'Techxagon'
  s.source = { :git => 'https://github.com/rogelioRuiz/dust-core-capacitor.git', :tag => s.version.to_s }

  s.source_files = 'ios/Sources/CorePlugin/CorePlugin.swift'
  s.module_name = 'CorePlugin'
  s.ios.deployment_target = '14.0'

  s.dependency 'Capacitor'
  s.dependency 'DustCore'
  s.swift_version = '5.9'
end
