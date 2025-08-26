export const SolutionStats = () => {
  const benefits = [
    {
      percentage: "25%",
      description: "Reduction in caesarean rates and fewer interventions",
      color: "text-secondary"
    },
    {
      percentage: "35%",
      description: "Less likely to report negative birth experiences",
      color: "text-secondary"
    },
    {
      percentage: "15%",
      description: "More likely to have spontaneous vaginal delivery",
      color: "text-secondary"
    }
  ];

  const demandStats = [
    {
      stat: "~700",
      description: "Active doulas in the UK serving only 2,000 births per year"
    },
    {
      stat: "~40%",
      description: "Year on year increase in enquiries reported by UK doula directories"
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto px-6">
        {/* Benefits Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12">
            Continuity in care leads to better birth outcomes
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="text-center group hover:transform hover:scale-105 transition-smooth"
              >
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-smooth">
                  <span className="text-2xl font-bold text-secondary">
                    {benefit.percentage}
                  </span>
                </div>
                <p className="text-foreground font-medium leading-relaxed max-w-xs mx-auto">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Demand Section */}
        <div className="text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-8 border-t border-b border-muted py-4">
            Demand is increasing
          </h3>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {demandStats.map((item, index) => (
              <div 
                key={index}
                className="text-center group hover:transform hover:scale-105 transition-smooth"
              >
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-smooth">
                  <span className="text-3xl font-bold text-primary">
                    {item.stat}
                  </span>
                </div>
                <p className="text-foreground font-medium leading-relaxed max-w-sm mx-auto">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};