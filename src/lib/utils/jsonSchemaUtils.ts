import type { JSONPath } from 'immutable-json-patch'
import type { JSONSchema, JSONSchemaDefinitions, JSONSchemaEnum } from '$lib/types'

/**
 * Find enum options for given path in a JSONSchema
 */
export function getJSONSchemaOptions(
  schema: JSONSchema,
  schemaDefinitions: JSONSchemaDefinitions | undefined,
  path: JSONPath
): JSONSchemaEnum | undefined {
  const schemaForPath = findSchema(schema, schemaDefinitions || {}, path)

  return schemaForPath ? findEnum(schemaForPath) : undefined
}

/**
 * find an enum definition in a JSON schema, as property `enum` or inside
 * one of the schemas composites (`oneOf`, `anyOf`, `allOf`)
 *
 * Source: https://github.com/josdejong/jsoneditor/blob/develop/src/js/Node.js
 */
export function findEnum(schema: JSONSchema): JSONSchemaEnum | undefined {
  if (Array.isArray(schema['enum'])) {
    return schema['enum']
  }

  const composite = schema['oneOf'] || schema['anyOf'] || schema['allOf']
  if (Array.isArray(composite)) {
    const match = composite.filter((entry) => entry.enum)
    if (match.length > 0) {
      return match[0].enum
    }
  }

  return undefined
}

/**
 * Return the part of a JSON schema matching given path.
 *
 * Source: https://github.com/josdejong/jsoneditor/blob/develop/src/js/Node.js
 */
export function findSchema(
  topLevelSchema: JSONSchema,
  schemaDefinitions: JSONSchemaDefinitions,
  path: JSONPath,
  currentSchema = topLevelSchema
): JSONSchema | undefined {
  const nextPath = path.slice(1, path.length)
  const nextKey = path[0]

  let possibleSchemas = [currentSchema]
  for (const subSchemas of [currentSchema.oneOf, currentSchema.anyOf, currentSchema.allOf]) {
    if (Array.isArray(subSchemas)) {
      possibleSchemas = possibleSchemas.concat(subSchemas)
    }
  }

  for (const schema of possibleSchemas) {
    currentSchema = schema

    if ('$ref' in currentSchema && typeof currentSchema.$ref === 'string') {
      const ref = currentSchema.$ref
      if (ref in schemaDefinitions) {
        currentSchema = schemaDefinitions[ref]
      } else if (ref.startsWith('#/')) {
        const refPath = ref.substring(2).split('/')
        currentSchema = topLevelSchema
        for (const segment of refPath) {
          if (segment in currentSchema) {
            currentSchema = currentSchema[segment] as JSONSchema
          } else {
            throw Error(`Unable to resolve reference ${ref}`)
          }
        }
      } else if (ref.match(/#\//g)?.length === 1) {
        const [schemaUrl, relativePath] = ref.split('#/')
        if (schemaUrl in schemaDefinitions) {
          const referencedSchema = schemaDefinitions[schemaUrl]
          const reference = { $ref: '#/'.concat(relativePath) }
          const auxNextPath = []
          auxNextPath.push(nextKey)
          if (nextPath.length > 0) {
            auxNextPath.push(...nextPath)
          }
          return findSchema(referencedSchema, schemaDefinitions, auxNextPath, reference)
        } else {
          throw Error(`Unable to resolve reference ${ref}`)
        }
      } else {
        throw Error(`Unable to resolve reference ${ref}`)
      }
    }

    // We have no more path segments to resolve, return the currently found schema
    // We do this here, after resolving references, in case of the leaf schema beeing a reference
    if (nextKey === undefined) {
      return currentSchema
    }

    if (
      typeof currentSchema.properties === 'object' &&
      currentSchema.properties &&
      nextKey in currentSchema.properties
    ) {
      currentSchema = (currentSchema.properties as Record<string, JSONSchema>)[nextKey]
      return findSchema(topLevelSchema, schemaDefinitions, nextPath, currentSchema)
    }

    if (typeof currentSchema.patternProperties === 'object' && currentSchema.patternProperties) {
      for (const prop in currentSchema.patternProperties) {
        if (nextKey.match(prop)) {
          currentSchema = (currentSchema.patternProperties as Record<string, JSONSchema>)[prop]
          return findSchema(topLevelSchema, schemaDefinitions, nextPath, currentSchema)
        }
      }
    }

    if (typeof currentSchema.additionalProperties === 'object') {
      currentSchema = currentSchema.additionalProperties as JSONSchema
      return findSchema(topLevelSchema, schemaDefinitions, nextPath, currentSchema)
    }

    if (typeof currentSchema.items === 'object' && currentSchema.items) {
      currentSchema = currentSchema.items as JSONSchema
      return findSchema(topLevelSchema, schemaDefinitions, nextPath, currentSchema)
    }
  }

  return undefined
}
