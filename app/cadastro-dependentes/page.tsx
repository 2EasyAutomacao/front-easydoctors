"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/Header";
import LoadingOverlay from "@/components/LoadingOverlay";
import SuccessModal from "@/components/SuccessModal";
import FormularioDependentes from "@/components/FormularioDependentes";
import { FormularioData, getCodigoPais } from "@/lib/dependentes-validators";

// Mapeamento de planos
const planos = {
  "7a356177-0a97-490d-b3f0-d7f4928a10f5": { nome: "assinatura_teste", dependentes: 0 },
  "fdff75fe-23c3-47d0-a84c-445532a878ef": { nome: "Plano 1 pessoa - Premium (6 meses)", dependentes: 0 },
  "9b4ace5f-1874-40ad-b5e9-93446a4447b9": { nome: "Plano 1 pessoa - VIP (12 meses)", dependentes: 0 },
  "fde207d4-fef1-4585-a285-c84507b85449": { nome: "Plano 1 pessoa: $29,90", dependentes: 1 },
  "1adf66a5-68a2-4533-a40b-14e149399130": { nome: "Plano 2 para até 4 pessoas: $49,90", dependentes: 4 },
  "94bf854e-b15e-4da3-b39d-b34cf5601388": { nome: "Plano 3 consulta única: $79,90", dependentes: 0 },
  "5b82a540-c362-4769-9331-6c69387f7176": { nome: "Plano 1 pessoa - Preferencial (3 meses)", dependentes: 0 },
  "46cb7319-1972-4af8-a216-d14a502f7394": { nome: "Plano 4 Valor adicional por dependente (mensal)", dependentes: 0 },
  "e2fde971-8359-486f-a9b7-12c9ac6dae09": { nome: "Plano 4 para até 4 pessoas - mês único: $89,90", dependentes: 4 },
  "c3323a7f-4ae6-4031-85d9-53fc892a016b": { nome: "Plano 2 para até 4 pessoas - Premium (6 meses)", dependentes: 4 },
  "2e15d471-d755-441f-abbf-3ebb89ad42d6": { nome: "Plano 2 para até 4 pessoas - VIP (12 meses)", dependentes: 4 },
  "108fa0a8-f6fb-46c3-a6b9-e5acce7adcf4": { nome: "Plano 2 para até 4 pessoas - Preferencial (3 meses)", dependentes: 4 }
};

export default function CadastroDependentesPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string>("https://easydoctors.us");
  const [planoInfo, setPlanoInfo] = useState<{ nome: string; dependentes: number } | null>(null);
  const [quantidadeDependentes, setQuantidadeDependentes] = useState(0);
  const [customerStripe, setCustomerStripe] = useState<string | null>(null);

  // Parse URL parameters
  useEffect(() => {
    const planoId = searchParams.get("plano");
    const dependentesParam = searchParams.get("dependentes");
    const customerStripeParam = searchParams.get("Customer_stripe");

    if (!planoId) {
      setError("ID do plano não encontrado na URL");
      return;
    }

    if (!customerStripeParam) {
      setError("ID do Stripe não encontrado na URL");
      return;
    }

    // Buscar informações do plano
    const plano = planos[planoId as keyof typeof planos];
    if (plano) {
      setPlanoInfo(plano);
      setQuantidadeDependentes(plano.dependentes);
    } else if (dependentesParam) {
      // Fallback para parâmetro dependentes
      const qtd = parseInt(dependentesParam);
      if (isNaN(qtd) || qtd < 0) {
        setError("Quantidade de dependentes inválida");
        return;
      }
      setQuantidadeDependentes(qtd);
      setPlanoInfo({ nome: "Plano personalizado", dependentes: qtd });
    } else {
      setError("Plano não encontrado e quantidade de dependentes não especificada");
      return;
    }

    setCustomerStripe(customerStripeParam);
  }, [searchParams]);

  const handleFormSubmit = async (data: FormularioData) => {
    setIsLoading(true);
    setError(null);

    try {
      const dependentesUrl = process.env.NEXT_PUBLIC_DEPENDENTES_URL;
      
      if (!dependentesUrl) {
        throw new Error('URL de dependentes não configurada');
      }

      const dadosParaEnvio = {
        titular: {
          tipoDocumento: data.titular.tipoDocumento,
          numeroDocumento: data.titular.numeroDocumento.replace(/\D/g, ''),
          genero: data.titular.genero,
        },
        dependentes: data.dependentes.map(dep => ({
          nome: dep.nome,
          telefone: dep.telefone.replace(/\D/g, ''),
          codigoPais: getCodigoPais(dep.codigoPais),
          email: dep.email,
          genero: dep.genero,
          tipoDocumento: dep.tipoDocumento,
          numeroDocumento: dep.numeroDocumento.replace(/\D/g, ''),
        })),
        plano: data.plano,
        quantidadeDependentes: quantidadeDependentes,
        customerStripe: customerStripe
      };

      console.log("Dados para envio:", dadosParaEnvio);

      const response = await fetch(dependentesUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaEnvio)
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const resultado = await response.json();
      console.log("Resposta da API:", resultado);
      
      // Verificar se há URL de redirecionamento na resposta
      if (resultado.redirect_url || resultado.url) {
        setRedirectUrl(resultado.redirect_url || resultado.url);
      }
      
      // Mostrar modal de sucesso
      setShowSuccessModal(true);

    } catch (err) {
      console.error("Erro no envio:", err);
      setError(err instanceof Error ? err.message : "Erro ao enviar cadastro");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Redirecionar para a URL
    window.location.href = redirectUrl;
  };

  if (error && !planoInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Alert variant="destructive" className="shadow-lg">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  if (!planoInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#74237F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando informações do plano...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#74237F] rounded-full mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="font-bold text-gray-900 mb-2 leading-tight" style={{ fontSize: '20px' }}>
            Cadastro de <span className="text-[#74237F]">Dependentes</span>
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed" style={{ fontSize: '16px' }}>
            Complete o cadastro dos dependentes para finalizar sua assinatura
          </p>
        </div>

        {/* Plano Info */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="shadow-xl border-0 bg-gradient-to-r from-[#74237F] to-[#8a49a1] text-white">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl text-white">Plano Selecionado</CardTitle>
              <CardDescription className="text-lg text-white/90">
                {planoInfo.nome}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-white">
                {quantidadeDependentes === 0 
                  ? "Sem dependentes" 
                  : `${quantidadeDependentes} dependente${quantidadeDependentes > 1 ? 's' : ''}`
                }
              </div>
              <div className="mt-4 text-sm text-white/80">
                {quantidadeDependentes > 0 
                  ? "Preencha os dados abaixo para cada dependente"
                  : "Apenas os dados do titular são necessários"
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário */}
        <div className="max-w-4xl mx-auto">
          <FormularioDependentes
            quantidadeDependentes={quantidadeDependentes}
            planoNome={planoInfo.nome}
            customerStripe={customerStripe!}
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-8 max-w-4xl mx-auto">
            <Alert variant={error.includes("sucesso") ? "default" : "destructive"} className="shadow-lg">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      <LoadingOverlay isVisible={isLoading} />
      
      {/* Modal de Sucesso */}
      <SuccessModal 
        open={showSuccessModal} 
        onClose={handleSuccessModalClose}
        redirectUrl={redirectUrl}
      />
    </div>
  );
}
