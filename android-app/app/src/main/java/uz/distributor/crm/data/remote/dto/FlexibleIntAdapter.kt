package uz.distributor.crm.data.remote.dto

import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import java.lang.reflect.Type

/** Backend number may arrive as int or double in JSON. */
class FlexibleIntAdapter : JsonDeserializer<Int> {
    override fun deserialize(json: JsonElement?, type: Type?, context: JsonDeserializationContext?): Int {
        if (json == null || json.isJsonNull) return 0
        return when {
            json.isJsonPrimitive && json.asJsonPrimitive.isString ->
                json.asString.toIntOrNull() ?: 0
            json.isJsonPrimitive && json.asJsonPrimitive.isNumber ->
                json.asDouble.toInt()
            else -> 0
        }
    }
}
