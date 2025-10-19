'use client'

import React from 'react'
import { WineReferenceBlock } from '../blocks/WineReferenceBlock'
import { NewsletterSignupBlock } from '../blocks/NewsletterSignupBlock'
import { CourseReferenceBlock } from '../blocks/CourseReferenceBlock'

interface RichTextProps {
  content: any // Using any for now since PayloadCMS 3 Lexical format varies
  className?: string
}

interface SerializedTextNode {
  type: 'text'
  text: string
  format?: number
  style?: string
  mode?: string
  detail?: number
  version?: number
}

interface SerializedElementNode {
  type: string
  children?: any[]
  format?: string | number
  indent?: number
  direction?: string
  tag?: string
  textFormat?: number
  textStyle?: string
  version?: number
  url?: string
  newTab?: boolean
  src?: string
  alt?: string
  width?: number
  height?: number
  value?: any
  relationTo?: string
  fields?: Record<string, any>
}

interface SerializedBlockNode {
  type: 'block'
  blockType: string
  fields?: Record<string, any>
}

export function RichTextRenderer({ content, className = '' }: RichTextProps) {
  if (!content) {
    return null
  }

  // Handle string content (legacy)
  if (typeof content === 'string') {
    return (
      <div
        className={`prose prose-lg max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  // Handle Lexical SerializedEditorState
  const renderNode = (node: any, index: number): React.ReactNode => {
    if (!node) return null

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      if (node.type === 'upload' || node.type === 'image') {
        console.log('Upload/Image node:', node)
      }
      if (node.type === 'block') {
        console.log('Block node:', node)
      }
    }

    // Handle text nodes
    if (node.type === 'text' && typeof node.text === 'string') {
      const textNode = node as SerializedTextNode

      let content: React.ReactNode = textNode.text

      // Apply formatting by wrapping in appropriate elements
      if (textNode.format) {
        if (textNode.format & 1) content = <strong>{content}</strong> // Bold
        if (textNode.format & 2) content = <em>{content}</em> // Italic
        if (textNode.format & 4) content = <u>{content}</u> // Underline
        if (textNode.format & 8) content = <s>{content}</s> // Strikethrough
        if (textNode.format & 16)
          content = (
            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{content}</code>
          ) // Code
      }

      return <span key={index}>{content}</span>
    }

    const elementNode = node as SerializedElementNode

    // Handle block nodes (like wine-reference)
    if (elementNode.type === 'block') {
      const blockNode = node as SerializedBlockNode
      const { blockType, ...fields } = blockNode.fields || {}

      if (blockType === 'wine-reference') {
        return (
          <div key={index} className="my-6">
            <WineReferenceBlock
              wine={fields.wine}
              displayStyle={fields.displayStyle || 'card'}
              showDetails={fields.showDetails}
              customText={fields.customText}
              caption={fields.caption}
              openInNewTab={fields.openInNewTab}
            />
          </div>
        )
      }

      if (blockType === 'newsletter-signup') {
        return (
          <div key={index} className="my-6">
            <NewsletterSignupBlock
              title={fields.title}
              description={fields.description}
              buttonText={fields.buttonText}
              placeholderText={fields.placeholderText}
              style={fields.style}
              backgroundColor={fields.backgroundColor}
              showIcon={fields.showIcon}
              disclaimer={fields.disclaimer}
            />
          </div>
        )
      }

      if (blockType === 'course-reference') {
        return (
          <div key={index} className="my-6">
            <CourseReferenceBlock
              course={fields.course}
              displayStyle={fields.displayStyle || 'card'}
              showDetails={fields.showDetails}
              customText={fields.customText}
              callToAction={fields.callToAction}
              caption={fields.caption}
              openInNewTab={fields.openInNewTab}
            />
          </div>
        )
      }

      // Fallback for unknown block types
      return (
        <div key={index} className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-red-600 font-semibold">Unknown block type: {blockType}</p>
          <pre className="text-xs text-red-500 mt-2 overflow-auto">
            {JSON.stringify(blockNode, null, 2)}
          </pre>
        </div>
      )
    }

    // Handle element nodes (paragraphs, headings, etc.)
    const children = elementNode.children?.map((child, idx) => renderNode(child, idx)) || []

    switch (elementNode.type) {
      case 'paragraph': {
        const hasBlockChild = Array.isArray(elementNode.children)
          ? elementNode.children.some((child: any) =>
              [
                'block',
                'image',
                'upload',
                'list',
                'heading',
                'quote',
                'code',
                'hr',
                'horizontalrule',
              ].includes(child?.type),
            )
          : false

        if (hasBlockChild) {
          return (
            <div key={index} className="mb-4">
              {children}
            </div>
          )
        }

        return (
          <p key={index} className="mb-4">
            {children}
          </p>
        )
      }

      case 'heading':
        const tag = elementNode.tag || 'h2'
        const headingClasses = {
          h1: 'text-4xl font-bold mb-6 mt-8',
          h2: 'text-3xl font-bold mb-5 mt-7',
          h3: 'text-2xl font-bold mb-4 mt-6',
          h4: 'text-xl font-bold mb-3 mt-5',
          h5: 'text-lg font-bold mb-3 mt-4',
          h6: 'text-base font-bold mb-2 mt-3',
        }

        switch (tag) {
          case 'h1':
            return (
              <h1 key={index} className={headingClasses.h1}>
                {children}
              </h1>
            )
          case 'h2':
            return (
              <h2 key={index} className={headingClasses.h2}>
                {children}
              </h2>
            )
          case 'h3':
            return (
              <h3 key={index} className={headingClasses.h3}>
                {children}
              </h3>
            )
          case 'h4':
            return (
              <h4 key={index} className={headingClasses.h4}>
                {children}
              </h4>
            )
          case 'h5':
            return (
              <h5 key={index} className={headingClasses.h5}>
                {children}
              </h5>
            )
          case 'h6':
            return (
              <h6 key={index} className={headingClasses.h6}>
                {children}
              </h6>
            )
          default:
            return (
              <h2 key={index} className={headingClasses.h2}>
                {children}
              </h2>
            )
        }

      case 'list':
        const listTag = elementNode.tag || 'ul'
        const listClasses =
          listTag === 'ol'
            ? 'list-decimal list-inside mb-4 space-y-2 pl-4'
            : 'list-disc list-inside mb-4 space-y-2 pl-4'

        return React.createElement(
          listTag,
          {
            key: index,
            className: listClasses,
          },
          children,
        )

      case 'listitem':
        return (
          <li key={index} className="mb-1">
            {children}
          </li>
        )

      case 'quote':
        return (
          <blockquote
            key={index}
            className="relative my-8 px-6 py-4 bg-gradient-to-r from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10 border-l-4 border-orange-400 rounded-r-lg"
          >
            <div className="relative">
              {/* Quote icon */}
              <div className="absolute -top-2 -left-2 text-orange-400/40 text-4xl font-serif leading-none select-none">
                "
              </div>

              {/* Quote content */}
              <div className="text-lg leading-relaxed text-gray-800 dark:text-gray-200 font-medium italic pt-2">
                {children}
              </div>
            </div>
          </blockquote>
        )

      case 'link':
        return (
          <a
            key={index}
            href={elementNode.url}
            target={elementNode.newTab ? '_blank' : undefined}
            rel={elementNode.newTab ? 'noopener noreferrer' : undefined}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {children}
          </a>
        )

      case 'linebreak':
        return <br key={index} />

      case 'horizontalrule':
      case 'hr':
        return <hr key={index} className="my-8 border-t-2 border-gray-300" />

      case 'upload':
      case 'image':
        // Debug log for upload nodes
        if (process.env.NODE_ENV === 'development') {
          console.log('Upload/Image node:', elementNode)
        }

        // Handle PayloadCMS upload relationship
        const uploadValue = elementNode.value
        let imageSrc = elementNode.src || elementNode.url
        let imageAlt = elementNode.alt || ''

        // Extract layout options from fields
        const layoutOptions = elementNode.fields || {}
        const imageLayout = layoutOptions.imageLayout || 'medium'
        const imageAlignment = layoutOptions.imageAlignment || 'center'
        const imageCaption = layoutOptions.imageCaption || ''
        const imageBorder = layoutOptions.imageBorder || false
        const imageShadow = layoutOptions.imageShadow !== false // Default to true

        // If it's a PayloadCMS relationship, extract the media data
        if (uploadValue && typeof uploadValue === 'object') {
          imageSrc = uploadValue.url || uploadValue.filename
          imageAlt = uploadValue.alt || uploadValue.text || imageAlt

          // If it's just an ID, construct the API URL
          if (!imageSrc && uploadValue.id) {
            imageSrc = `/api/media/file/${uploadValue.filename || uploadValue.id}`
          }
        }

        // Handle direct relationship ID
        if (elementNode.relationTo === 'media' && !imageSrc) {
          imageSrc = `/api/media/file/${elementNode.value}`
        }

        if (!imageSrc) {
          return (
            <div key={index} className="my-6 p-4 bg-gray-100 border border-gray-300 rounded">
              <p className="text-gray-600 text-center">Image not found</p>
              {process.env.NODE_ENV === 'development' && (
                <pre className="text-xs mt-2 text-gray-500">
                  {JSON.stringify(elementNode, null, 2)}
                </pre>
              )}
            </div>
          )
        }

        // Build CSS classes based on layout options
        const sizeClasses = {
          icon: 'max-w-[100px]',
          thumbnail: 'max-w-[150px]',
          small: 'max-w-sm',
          medium: 'max-w-2xl',
          large: 'max-w-4xl',
          full: 'w-full max-w-none',
        }

        const alignmentClasses = {
          left: 'mr-auto',
          center: 'mx-auto',
          right: 'ml-auto',
        }

        const containerClasses = [
          'my-6',
          sizeClasses[imageLayout as keyof typeof sizeClasses] || sizeClasses.medium,
          alignmentClasses[imageAlignment as keyof typeof alignmentClasses] ||
            alignmentClasses.center,
        ].join(' ')

        const imageClasses = [
          'h-auto rounded-lg',
          imageShadow ? 'shadow-lg' : '',
          imageBorder ? 'border border-gray-200' : '',
          imageLayout === 'full' ? 'w-full' : 'max-w-full',
          // Adjust styling for very small images
          imageLayout === 'icon' ? 'rounded-md shadow-md' : '',
          imageLayout === 'thumbnail' ? 'rounded-md' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div key={index} className={containerClasses}>
            <img
              src={imageSrc}
              alt={imageAlt}
              width={elementNode.width}
              height={elementNode.height}
              className={imageClasses}
              loading="lazy"
            />
            {(imageCaption || imageAlt) && (
              <p className="text-sm text-gray-600 text-center mt-3 italic">
                {imageCaption || imageAlt}
              </p>
            )}
          </div>
        )

      case 'code':
        return (
          <pre key={index} className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
            <code className="text-sm">{children}</code>
          </pre>
        )

      case 'inline-code':
        return (
          <code key={index} className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
            {children}
          </code>
        )

      default:
        // Log unknown types for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('Unknown node type:', elementNode.type, elementNode)
        }
        return <div key={index}>{children}</div>
    }
  }

  const renderContent = () => {
    if (content.root && content.root.children) {
      return content.root.children.map((child: any, index: number) => renderNode(child, index))
    }
    return null
  }

  return (
    <div className={`prose prose-lg max-w-none leading-relaxed ${className}`}>
      {renderContent()}
    </div>
  )
}
