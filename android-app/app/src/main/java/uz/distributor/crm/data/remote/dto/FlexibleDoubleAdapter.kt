package uz.distributor.crm.data.remote.dto

import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import java.lang.reflect.Type

/** Backend ba'zan number, ba'zan string qaytaradi (decimal maydonlar). */
class FlexibleDoubleAdapter : JsonDeserializer<Double> {
    override fun deserialize(json: JsonElement?, type: Type?, context: JsonDeserializationContext?): Double {
        if (json == null || json.isJsonNull) return 0.0
        return when {
            json.isJsonPrimitive && json.asJsonPrimitive.isString ->
                json.asString.toDoubleOrNull() ?: 0.0
            json.isJsonPrimitive && json.asJsonPrimitive.isNumber ->
                json.asDouble
            else -> 0.0
        }
    }
}
