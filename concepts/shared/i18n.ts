// One site, two languages: every component asks for the copy of its page's language.
import * as ar from './content';
import * as en from './content.en';

export type Lang = 'ar' | 'en';
export type Content = typeof ar;

export const getContent = (lang: Lang = 'ar'): Content => (lang === 'en' ? en : ar) as unknown as Content;
