/**
 * Payload hook to automatically set createdBy field
 * Usage: hooks: { beforeChange: [setCreatedBy] }
 */
export const setCreatedBy = (args: any) => {
  const { req, operation, value } = args

  if (req?.user && operation === 'create') {
    return req.user.id
  }

  return value
}

/**
 * Payload hook to automatically set updatedBy field
 * Usage: hooks: { beforeChange: [setUpdatedBy] }
 */
export const setUpdatedBy = (args: any) => {
  const { req, operation, value } = args

  if (req?.user && (operation === 'create' || operation === 'update')) {
    return req.user.id
  }

  return value
}

/**
 * Collection-level hook to automatically set createdBy and updatedBy fields
 * Usage: hooks: { beforeChange: [withCreatedByUpdatedBy] }
 * 
 * SAFE: Handles null/undefined data safely for form building
 */
export const withCreatedByUpdatedBy = (args: any) => {
  const { req, operation, data } = args

  // Ensure data exists - return early if null (form building)
  if (!data) {
    return data
  }

  // Clone data to avoid mutations
  let newData = { ...data }

  // Only set metadata if user exists
  if (req?.user) {
    if (operation === 'create') {
      newData.createdBy = req.user.id
      newData.updatedBy = req.user.id
    } else if (operation === 'update') {
      newData.updatedBy = req.user.id
    }
  }

  return newData
}
