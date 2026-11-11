'use client';

export default function PublicationError({ reset }: { reset: () => void }) {
  return <main lang="es" className="flex min-h-svh flex-col items-center justify-center bg-[#f7f2e9] px-6 text-center text-[#24382e]">
    <p className="text-sm uppercase tracking-widest">Suites Mine</p>
    <h1 className="mt-6 font-serif text-4xl">La agenda no está disponible por el momento.</h1>
    <p className="mt-4 leading-7">Inténtalo de nuevo en unos instantes.</p>
    <button type="button" onClick={reset} className="mt-6 min-h-12 rounded-lg bg-[#244234] px-6 py-3 text-white">Volver a intentar</button>
  </main>;
}
