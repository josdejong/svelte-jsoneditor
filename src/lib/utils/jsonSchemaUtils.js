/**
 * Find enum options for given path in a JSONSchema
 * @param {JSON} schema
 * @param {JSON} schemaRefs
 * @param {Path} path
 * @returns {Array<any> | null}
 */
export function getJSONSchemaOptions(schema, schemaRefs, path) {
  const schemaForPath = findSchema(schema, schemaRefs || {}, path)

  return schemaForPath ? findEnum(schemaForPath) : null
}

/**
 * find an enum definition in a JSON schema, as property `enum` or inside
 * one of the schemas composites (`oneOf`, `anyOf`, `allOf`)
 *
 * Source: https://github.com/josdejong/jsoneditor/blob/develop/src/js/Node.js
 *
 * @param  {Object} schema
 * @return {Array | null} Returns the enum when found, null otherwise.
 * @private
 */
export function findEnum(schema) {
  if (schema.enum) {
    return schema.enum
  }

  const composite = schema.oneOf || schema.anyOf || schema.allOf
  if (composite) {
    const match = composite.filter((entry) => entry.enum)
    if (match.length > 0) {
      return match[0].enum
    }
  }

  return null
}

/**
 * Return the part of a JSON schema matching given path.
 *
 * Source: https://github.com/josdejong/jsoneditor/blob/develop/src/js/Node.js
 *
 * @param {JSON} topLevelSchema
 * @param {JSON} schemaRefs
 * @param {Array.<string | number>} path
 * @param {Object} currentSchema
 * @return {Object | null}
 * @private
 */
export function findSchema(topLevelSchema, schemaRefs, path, currentSchema = topLevelSchema) {
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
      if (ref in schemaRefs) {
        currentSchema = schemaRefs[ref]
      } else if (ref.startsWith('#/')) {
        const refPath = ref.substring(2).split('/')
        currentSchema = topLevelSchema
        for (const segment of refPath) {
          if (segment in currentSchema) {
            currentSchema = currentSchema[segment]
          } else {
            throw Error(`Unable to resovle reference ${ref}`)
          }
        }
      } else if (ref.match(/#\//g)?.length === 1) {
        const [schemaUrl, relativePath] = ref.split('#/')
        if (schemaUrl in schemaRefs) {
          const referencedSchema = schemaRefs[schemaUrl]
          const reference = { $ref: '#/'.concat(relativePath) }
          const auxNextPath = []
          auxNextPath.push(nextKey)
          if (nextPath.length > 0) {
            auxNextPath.push(...nextPath)
          }
          return findSchema(referencedSchema, schemaRefs, auxNextPath, reference)
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

    if (typeof nextKey === 'string') {
      if (
        typeof currentSchema.properties === 'object' &&
        currentSchema.properties !== null &&
        nextKey in currentSchema.properties
      ) {
        currentSchema = currentSchema.properties[nextKey]
        return findSchema(topLevelSchema, schemaRefs, nextPath, currentSchema)
      }
      if (
        typeof currentSchema.patternProperties === 'object' &&
        currentSchema.patternProperties !== null
      ) {
        for (const prop in currentSchema.patternProperties) {
          if (nextKey.match(prop)) {
            currentSchema = currentSchema.patternProperties[prop]
            return findSchema(topLevelSchema, schemaRefs, nextPath, currentSchema)
          }
        }
      }
      if (typeof currentSchema.additionalProperties === 'object') {
        currentSchema = currentSchema.additionalProperties
        return findSchema(topLevelSchema, schemaRefs, nextPath, currentSchema)
      }
      continue
    }
    if (
      typeof nextKey === 'number' &&
      typeof currentSchema.items === 'object' &&
      currentSchema.items !== null
    ) {
      currentSchema = currentSchema.items
      return findSchema(topLevelSchema, schemaRefs, nextPath, currentSchema)
    }
  }

  return null
}
