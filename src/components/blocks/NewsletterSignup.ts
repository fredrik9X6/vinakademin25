import type { Block } from 'payload'

export const NewsletterSignup: Block = {
  slug: 'newsletter-signup',
  interfaceName: 'NewsletterSignupBlock',
  labels: {
    singular: 'Nyhetsbrevsprenumeration',
    plural: 'Nyhetsbrevsprenumerationer',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Rubrik',
      defaultValue: 'Veckans Vintips',
      admin: {
        description: 'Huvudrubrik för nyhetsbrevsprenumeration',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Beskrivning',
      defaultValue:
        'Få veckans bästa vintips, smaknoter och expertråd direkt i din inbox. Lär dig om vin utan flum.',
      admin: {
        description: 'Beskrivningstext under rubriken',
      },
    },
    {
      name: 'buttonText',
      type: 'text',
      label: 'Knapptext',
      defaultValue: 'Skicka mig vintips',
      admin: {
        description: 'Text för prenumerationsknappen',
      },
    },
    {
      name: 'placeholderText',
      type: 'text',
      label: 'E-post Platshållare',
      defaultValue: 'Ange din e-postadress',
      admin: {
        description: 'Platshållartext för e-postfältet',
      },
    },
    {
      name: 'style',
      type: 'select',
      label: 'Stil',
      options: [
        { label: 'Minimalt Kort', value: 'minimal' },
        { label: 'Framhävd Box', value: 'featured' },
        { label: 'Inbäddad Banner', value: 'inline' },
        { label: 'Svensk Stil', value: 'swedish' },
      ],
      defaultValue: 'featured',
      admin: {
        description: 'Visuell stil för nyhetsbrevsprenumerationen',
      },
    },
    {
      name: 'backgroundColor',
      type: 'select',
      label: 'Bakgrundsfärg',
      options: [
        { label: 'Standard (Grå)', value: 'default' },
        { label: 'Orange Accent', value: 'orange' },
        { label: 'Blå Accent', value: 'blue' },
        { label: 'Grön Accent', value: 'green' },
        { label: 'Transparent', value: 'transparent' },
      ],
      defaultValue: 'orange',
      admin: {
        description: 'Bakgrundsfärgtema',
        condition: (data, siblingData) => siblingData.style !== 'inline',
      },
    },
    {
      name: 'showIcon',
      type: 'checkbox',
      label: 'Visa Nyhetsbrev-ikon',
      defaultValue: true,
      admin: {
        description: 'Visa nyhetsbrev/e-post-ikon',
      },
    },
    {
      name: 'disclaimer',
      type: 'text',
      label: 'Integritetsdisclaimer',
      defaultValue: 'Vi respekterar din integritet. Avsluta prenumerationen när du vill.',
      admin: {
        description: 'Liten integriteetstext under formuläret',
      },
    },
  ],
}
