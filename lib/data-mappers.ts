export const poleMap = new Map([
  ['polytechnique', 'Polytechnique'],
  ['commerce', 'Commerce'],
  ['droit', 'Droit'],
]);

export const filiereMap = new Map([
  ['gi', 'Génie Informatique'],
  ['gm', 'Génie Mécanique'],
  ['ge', 'Génie Electrique'],
  ['gc', 'Génie civil'],
  ['gs', 'Geosciences'],
]);

export const optionMap = new Map([
    ['gl', 'Génie Logiciel'],
    ['rt', 'Réseaux et Télécommunications'],
    ['di', 'Développement Informatique'],
    ['ia', 'Intelligence Artificielle'],
    ['mi', 'Maintenance Industrielle'],
    ['em', 'Electromecanique'],
    ['m', 'Mécatronique'],
    ['et', 'Electrotechnique'],
    ['aii', 'Automatisme et Informatique industrielle'],
    ['ai', 'Automatisme et instrumentation'],
    ['gp/gc', 'Génie des procedés/ Genie chimique'],
    ['gpa', 'Génie des procédés alimentaire'],
    ['qhse', 'Qualité hygiène décurité & environnement'],
    ['rp', 'Raffinage & pétrochimie'],
    ['btp', 'Bâtiment & travaux publics'],
    ['au', 'Architecture & urbanisation'],
    ['gt', 'Géomètre et topographe'],
    ['mc', 'Mines & carrières'],
    ['gp', 'Génie pétrolier'],
    ['gghs', 'Génie géologique de hydro systèmes'],
    ['ge', 'Géophysique'],
    ['gga', 'Géotechnique & géologie appliquée'],
    ['ge', "Gestion de l'environnement "],
    ['mco', 'Management commercial Opérationnel'],
    ['cge', 'Comptabilité&Gestion entreprise'],
    ['tci', 'Transit& Commerce International'],
    ['grh', 'Gestions Des Resources Humaines'],
    ['bf', 'Banke & Finance & assurances'],
    ['btm', 'Business Trade & Marketing'],
    ['mdc', 'Marketing digital & Communication'],
    ['cf', 'Comptabilité é finances'],
    ['TL', 'Transport & Logistique'],
    ['ep', 'Economie Pétrolière'],
    ['am', 'Assistant De Manager'],
    ['dri', 'Diplomatie & Relations Internationales'],
    ['sp', 'Sciences Politiques'],
    ['da', 'Droit Des Affaires'],
    ['dp', 'Droit Public'],
    ['Dv', 'Droit Privé'],
]);

export function getFullName(type: 'pole' | 'filiere' | 'option', value: string | null | undefined): string {
    if (!value) return '';
    switch (type) {
        case 'pole':
            return poleMap.get(value) || value;
        case 'filiere':
            return filiereMap.get(value) || value;
        case 'option':
            return optionMap.get(value) || value;
        default:
            return value;
    }
}
