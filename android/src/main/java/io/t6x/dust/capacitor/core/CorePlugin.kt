package io.t6x.dust.capacitor.core

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import io.t6x.dust.core.DustCore

@CapacitorPlugin(name = "Core")
class CorePlugin : Plugin() {

    companion object {
        const val CONTRACT_VERSION = DustCore.VERSION
    }

    @PluginMethod
    fun getContractVersion(call: PluginCall) {
        val result = JSObject()
        result.put("version", CONTRACT_VERSION)
        call.resolve(result)
    }
}
