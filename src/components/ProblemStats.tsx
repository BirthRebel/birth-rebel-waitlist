export const ProblemStats = () => {
  const stats = [
    "1 in 3 women describe their birth experience as traumatic",
    "Only 69% of women report receiving adequate antenatal care support",
    "42% of all births end in caesarean section, often due to lack of continuous care",
    "25% of women feel abandoned during or shortly after birth",
    "Estimated shortage of 2,500 full-time midwives creating care gaps"
  ];

  return (
    <section className="py-20 bg-gradient-soft">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              For expectant and new mothers
            </h2>
            <p className="text-xl md:text-2xl text-primary font-semibold mb-4">
              Trust in maternal care is broken
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The current healthcare system is failing mothers when they need support most. 
              These statistics reveal the urgent need for accessible, continuous maternal care.
            </p>
          </div>

          <div className="space-y-4">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-4 bg-background/50 rounded-lg border border-primary/10 hover:border-primary/20 transition-smooth"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-3 flex-shrink-0"></div>
                <p className="text-foreground font-medium leading-relaxed">
                  {stat}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};